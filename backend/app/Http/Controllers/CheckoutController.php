<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use App\Models\Address;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;

class CheckoutController extends Controller
{
    // GET /api/checkout/init
    public function init(Request $request)
    {
        $user = $request->user();
        $orderCode = $request->query('order_code'); // optional for resume

        // If resuming a pending order, return its items instead of cart
        if ($orderCode) {
            $order = Order::where('order_code', $orderCode)
                ->where('user_id', $user->id)
                ->where('status', 'pending')
                ->with(['address', 'items.product'])
                ->first();

            if ($order) {
                $items = $order->items->map(function ($it) {
                    return [
                        'id' => $it->id,
                        'product_id' => $it->product_id,
                        'quantity' => (int) $it->quantity,
                        'price' => (float) $it->price,
                        'total' => (float) $it->price * (int) $it->quantity,
                        'product' => $it->product ? [
                            'id' => $it->product->id,
                            'name' => $it->product->name,
                            'slug' => $it->product->slug,
                            'main_image_url' => $it->product->main_image_url,
                        ] : null,
                    ];
                });

                $subtotal = $items->sum('total');
                $shippingFee = max(0, (float) $order->total_price - (float) $subtotal);

                // Load courier row to expose its info
                $courierRow = DB::table('couriers')->where('id', $order->courier_id)->first();
                $courierData = $courierRow ? [
                    'id' => $courierRow->id,
                    'name' => $courierRow->name ?? ($courierRow->code ?? 'Courier'),
                    'code' => $courierRow->code ?? null,
                    'price' => isset($courierRow->price) ? (float) $courierRow->price : $shippingFee,
                ] : null;

                return response()->json([
                    'existing_order' => true,
                    'order_code' => $order->order_code,
                    'order_id' => $order->id,
                    'default_address_id' => $order->address_id,
                    'default_courier_id' => $order->courier_id,
                    'shipping_fee' => $shippingFee,
                    'order_address' => $order->address ? [
                        'id' => $order->address->id,
                        'nama_tempat' => $order->address->nama_tempat,
                        'no_telp' => $order->address->no_telp,
                        'alamat' => $order->address->alamat,
                        'kecamatan' => $order->address->kecamatan,
                        'kabupaten' => $order->address->kabupaten,
                        'provinsi' => $order->address->provinsi,
                    ] : null,
                    'order_courier' => $courierData,
                    // Keep cart shape consistent
                    'cart' => [
                        'items' => $items,
                        'subtotal' => (float) $subtotal,
                    ],
                ], 200);
            }
        }

        // Addresses of user
        $addresses = Address::where('user_id', $user->id)
            ->orderByDesc('id')
            ->get();

        // Couriers (fallback price=0 if column missing)
        $couriers = DB::table('couriers')->get()->map(function ($c) {
            return (object) [
                'id'    => $c->id,
                'name'  => $c->name ?? ($c->code ?? 'Courier'),
                'code'  => $c->code ?? null,
                'price' => isset($c->price) ? (float) $c->price : 0.0,
            ];
        });

        // Cart summary (reuse logic similar to CartController@index)
        $cart = DB::table('carts')->where('user_id', $user->id)->first();
        $items = collect();
        $subtotal = 0.0;

        if ($cart) {
            $raw = DB::table('cart_items')->where('cart_id', $cart->id)->get();
            $items = $raw->map(function ($row) use (&$subtotal) {
                $product = Product::find($row->product_id);
                $total = (float) $row->price * (int) $row->quantity;
                $subtotal += $total;
                return [
                    'id'       => $row->id,
                    'product_id' => $row->product_id,
                    'quantity' => (int) $row->quantity,
                    'price'    => (float) $row->price,
                    'total'    => $total,
                    'product'  => $product ? [
                        'id' => $product->id,
                        'name' => $product->name,
                        'slug' => $product->slug,
                        'main_image_url' => $product->main_image_url,
                    ] : null,
                ];
            });
        }

        // Suggest defaults for the UI
        $defaultAddressId = $addresses->first()->id ?? null;
        $defaultCourierId = ($couriers->first()->id ?? null);

        return response()->json([
            'addresses' => $addresses,
            'couriers'  => $couriers,
            'default_address_id' => $defaultAddressId,
            'default_courier_id' => $defaultCourierId,
            'cart'      => [
                'items'    => $items,
                'subtotal' => (float) $subtotal,
            ],
        ], 200);
    }

    // POST /api/checkout/place
    public function place(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'address_id' => ['required', 'integer', 'exists:addresses,id'],
            'courier_id' => ['required', 'integer', 'exists:couriers,id'],
            'notes'      => ['nullable', 'string'],
        ]);

        // Validate address ownership
        $address = Address::where('id', $data['address_id'])->where('user_id', $user->id)->first();
        if (!$address) {
            return response()->json(['message' => 'Invalid address'], 422);
        }

        // Load cart
        $cart = DB::table('carts')->where('user_id', $user->id)->first();
        if (!$cart) {
            return response()->json(['message' => 'Cart is empty'], 422);
        }
        $cartItems = DB::table('cart_items')->where('cart_id', $cart->id)->get();
        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'Cart is empty'], 422);
        }

        // Load courier; shipping fee is optional if column missing
        $courier = DB::table('couriers')->where('id', $data['courier_id'])->first();
        if (!$courier) {
            return response()->json(['message' => 'Invalid courier'], 422);
        }
        $shippingFee = isset($courier->price) ? (float) $courier->price : 0.0;

        // Compute subtotal and check stock
        $subtotal = 0.0;
        foreach ($cartItems as $ci) {
            $product = Product::find($ci->product_id);
            if (!$product || !$product->is_active) {
                return response()->json(['message' => 'One or more products are unavailable.'], 422);
            }
            if ((int)$ci->quantity > (int)$product->stock) {
                return response()->json(['message' => 'Insufficient stock for ' . $product->name], 422);
            }
            $subtotal += ((float)$ci->price * (int)$ci->quantity);
        }
        $total = $subtotal + $shippingFee;

        // Create order transactionally
        $order = DB::transaction(function () use ($user, $data, $cartItems, $subtotal, $shippingFee, $total) {
            $orderCode = 'RB' . date('Ymd') . Str::upper(Str::random(6));

            $order = Order::create([
                'user_id'     => $user->id,
                'address_id'  => $data['address_id'],
                'courier_id'  => $data['courier_id'],
                'order_code'  => $orderCode,
                'total_price' => $total,
                'status'      => 'pending',
                'is_complete' => false,
            ]);

            foreach ($cartItems as $ci) {
                OrderItem::create([
                    'order_id'   => $order->id,
                    'product_id' => $ci->product_id,
                    'quantity'   => (int) $ci->quantity,
                    'price'      => (float) $ci->price,
                ]);
            }

            return $order;
        });

        $order->load(['items.product', 'address']);

        return response()->json([
            'message'        => 'Order placed.',
            'order'          => $order,
            'shipping_price' => $shippingFee,
            'subtotal'       => $subtotal,
            'total'          => $total,
        ], 201);
    }

    /**
     * Create order (status=pending) and request Midtrans Snap token.
     * POST /api/checkout/pay
     */
    public function pay(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'address_id' => ['sometimes','integer','exists:addresses,id'],
            'courier_id' => ['sometimes','integer','exists:couriers,id'],
            'order_code' => ['nullable','string','exists:orders,order_code'],
        ]);

        // --- Resume existing pending order path with cache & retry suffix ---
        if (!empty($data['order_code'])) {
            $order = Order::where('order_code', $data['order_code'])
                ->where('user_id', $user->id)
                ->where('status', 'pending')
                ->first();
            if (!$order) {
                return response()->json(['message' => 'Order not found or not pending.'], 422);
            }

            // If user provided new address/courier, validate ownership and update.
            if (isset($data['address_id'])) {
                $address = Address::where('id', $data['address_id'])->where('user_id', $user->id)->first();
                if (!$address) {
                    return response()->json(['message' => 'Invalid address'], 422);
                }
                $order->address_id = $address->id;
            }

            $shippingFee = 0.0;
            if (isset($data['courier_id'])) {
                $courierRow = DB::table('couriers')->where('id', $data['courier_id'])->first();
                if (!$courierRow) {
                    return response()->json(['message' => 'Invalid courier'], 422);
                }
                $order->courier_id = $courierRow->id;
                $shippingFee = isset($courierRow->price) ? (float) $courierRow->price : 0.0;
            } else {
                // Use existing courier
                $courierRow = DB::table('couriers')->where('id', $order->courier_id)->first();
                $shippingFee = $courierRow && isset($courierRow->price) ? (float) $courierRow->price : 0.0;
            }

            // Rebuild item details from existing order items.
            $itemDetails = [];
            $subtotal = 0.0;
            foreach ($order->items()->with('product')->get() as $it) {
                if (!$it->product || !$it->product->is_active) {
                    return response()->json(['message' => 'Product unavailable: '.$it->product_id], 422);
                }
                if ((int)$it->quantity > (int)$it->product->stock) {
                    return response()->json(['message' => 'Insufficient stock for '.$it->product->name], 422);
                }
                $lineTotal = (float)$it->price * (int)$it->quantity;
                $subtotal += $lineTotal;
                $itemDetails[] = [
                    'id' => (string)$it->product_id,
                    'price' => (int)$it->price,
                    'quantity' => (int)$it->quantity,
                    'name' => substr($it->product->name, 0, 50),
                ];
            }
            if ($shippingFee > 0) {
                $itemDetails[] = [
                    'id' => 'SHIP-'.$order->courier_id,
                    'price' => (int)$shippingFee,
                    'quantity' => 1,
                    'name' => 'Shipping',
                ];
            }
            $total = $subtotal + $shippingFee;

            // Persist updated totals before requesting token.
            $order->total_price = $total;
            $order->save();

            // 1. Try to reuse cached snap token
            $cacheKeyToken = 'snap_token:' . $order->order_code;
            $cacheKeyMidtransId = 'midtrans_order_id:' . $order->order_code;
            $cachedToken = Cache::get($cacheKeyToken);
            $cachedMidtransOrderId = Cache::get($cacheKeyMidtransId);

            if ($cachedToken && $cachedMidtransOrderId) {
                return response()->json([
                    'message' => 'Reusing existing snap token.',
                    'order_code' => $order->order_code,
                    'snap_token' => $cachedToken,
                    'midtrans_order_id' => $cachedMidtransOrderId,
                    'redirect_url' => "https://app.sandbox.midtrans.com/snap/v2/vtweb/{$cachedToken}",
                ], 200);
            }

            // 2. Generate a new unique Midtrans order_id with suffix to avoid duplicate constraint
            $midtransOrderId = $order->order_code . '-R' . now()->format('His');

            $serverKey = env('MIDTRANS_SERVER_KEY');
            if (!$serverKey) {
                return response()->json(['message' => 'Midtrans server key not configured'], 500);
            }

            $payload = [
                'transaction_details' => [
                    'order_id' => $midtransOrderId,
                    'gross_amount' => (int)$total,
                ],
                'customer_details' => [
                    'first_name' => $user->name,
                    'email' => $user->email,
                ],
                'item_details' => $itemDetails,
            ];

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => 'https://app.sandbox.midtrans.com/snap/v1/transactions',
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Accept: application/json',
                    'Authorization: Basic '.base64_encode($serverKey.':'),
                ],
                CURLOPT_POSTFIELDS => json_encode($payload),
            ]);
            $resp = curl_exec($ch);
            $err = curl_error($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($err || !$resp || $code >= 300) {
                return response()->json([
                    'message' => 'Failed to get snap token',
                    'error' => $err,
                    'http_code' => $code,
                    'midtrans_response' => $resp ? json_decode($resp, true) : null
                ], 502);
            }

            $json = json_decode($resp, true);
            $snapToken = $json['token'] ?? null;
            // Cache token + midtransOrderId for reuse (TTL e.g. 2 hours)
            if ($snapToken) {
                Cache::put($cacheKeyToken, $snapToken, now()->addHours(2));
                Cache::put($cacheKeyMidtransId, $midtransOrderId, now()->addHours(2));
            }

            return response()->json([
                'message' => 'Snap token generated for updated pending order.',
                'order_code' => $order->order_code,
                'midtrans_order_id' => $midtransOrderId,
                'snap_token' => $snapToken,
                'redirect_url' => $json['redirect_url'] ?? null,
                'total' => $total,
                'shipping_fee' => $shippingFee,
                'subtotal' => $subtotal,
            ], 201);
        }

        // Ownership check
        $address = Address::where('id',$data['address_id'])->where('user_id',$user->id)->first();
        if (!$address) return response()->json(['message'=>'Invalid address'],422);

        $cart = DB::table('carts')->where('user_id',$user->id)->first();
        if (!$cart) return response()->json(['message'=>'Cart is empty'],422);
        $cartItems = DB::table('cart_items')->where('cart_id',$cart->id)->get();
        if ($cartItems->isEmpty()) return response()->json(['message'=>'Cart is empty'],422);

        $courier = DB::table('couriers')->where('id',$data['courier_id'])->first();
        if (!$courier) return response()->json(['message'=>'Invalid courier'],422);
        $shippingFee = isset($courier->price) ? (float)$courier->price : 0.0;

        // Build subtotal (do NOT decrement stock yet)
        $subtotal = 0.0;
        $itemDetails = [];
        foreach ($cartItems as $ci) {
            $product = Product::find($ci->product_id);
            if (!$product || !$product->is_active) {
                return response()->json(['message'=>'Product unavailable: '.$ci->product_id],422);
            }
            if ((int)$ci->quantity > (int)$product->stock) {
                return response()->json(['message'=>'Insufficient stock for '.$product->name],422);
            }
            $lineTotal = (float)$ci->price * (int)$ci->quantity;
            $subtotal += $lineTotal;
            $itemDetails[] = [
                'id' => (string)$product->id,
                'price' => (int) $ci->price,
                'quantity' => (int) $ci->quantity,
                'name' => substr($product->name,0,50),
            ];
        }
        if ($shippingFee > 0) {
            $itemDetails[] = [
                'id' => 'SHIP-'.$courier->id,
                'price' => (int)$shippingFee,
                'quantity' => 1,
                'name' => 'Shipping '.$courier->name,
            ];
        }
        $total = $subtotal + $shippingFee;

        // Create pending order + items (without stock reduction)
        $orderCode = 'RB'.date('Ymd').Str::upper(Str::random(6));
        $order = Order::create([
            'user_id' => $user->id,
            'address_id' => $data['address_id'],
            'courier_id' => $data['courier_id'],
            'order_code' => $orderCode,
            'total_price' => $total,
            'status' => 'pending',
            'is_complete' => false,
        ]);
        foreach ($cartItems as $ci) {
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $ci->product_id,
                'quantity' => (int)$ci->quantity,
                'price' => (float)$ci->price,
            ]);
        }

        // Request Snap token
        $serverKey = env('MIDTRANS_SERVER_KEY');
        if (!$serverKey) {
            return response()->json(['message'=>'Midtrans server key not configured'],500);
        }

        $payload = [
            'transaction_details' => [
                'order_id' => $orderCode,
                'gross_amount' => (int)$total,
            ],
            'customer_details' => [
                'first_name' => $user->name,
                'email' => $user->email,
            ],
            'item_details' => $itemDetails,
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => 'https://app.sandbox.midtrans.com/snap/v1/transactions',
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Basic '.base64_encode($serverKey.':'),
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
        ]);
        $resp = curl_exec($ch);
        $err = curl_error($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($err || !$resp || $code >= 300) {
            return response()->json(['message'=>'Failed to get snap token','error'=>$err,'http_code'=>$code],502);
        }
        $json = json_decode($resp,true);
        $snapToken = $json['token'] ?? null;
        if (!$snapToken) {
            return response()->json(['message'=>'Snap token missing','raw'=>$json],502);
        }

        return response()->json([
            'message'=>'Order created. Snap token generated.',
            'order_code'=>$orderCode,
            'snap_token'=>$snapToken,
            'redirect_url' => $json['redirect_url'] ?? null, // added
        ],201);
    }

    /**
     * Client-side confirm after snap success if notification not yet processed.
     * POST /api/checkout/confirm {order_code}
     */
    public function confirm(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'order_code' => ['required','string'],
        ]);
        $order = Order::where('order_code',$data['order_code'])->where('user_id',$user->id)->first();
        if (!$order) return response()->json(['message'=>'Order not found'],404);
        if ($order->status === 'paid') {
            return response()->json(['message'=>'Already paid','order'=>$order],200);
        }
        // Mark paid + reduce stock + clear cart (idempotent)
        $this->finalizePaid($order,$user->id);
        return response()->json(['message'=>'Order marked paid','order'=>$order],200);
    }

    /**
     * Midtrans notification handler (no auth).
     * POST /api/midtrans/notify
     */
    public function notify(Request $request)
    {
        $payload = $request->all();
        $orderCodeRaw = $payload['order_id'] ?? null;

        // Strip retry suffix (-RHHMMSS) if present to map back to original order_code
        $baseOrderCode = $orderCodeRaw ? preg_replace('/-R\d{6}$/', '', $orderCodeRaw) : null;

        $status = $payload['transaction_status'] ?? null;
        if (!$baseOrderCode || !$status) return response()->json(['message'=>'Invalid notification'],422);

        $order = Order::where('order_code',$baseOrderCode)->first();
        if (!$order) return response()->json(['message'=>'Order not found'],404);

        if (in_array($status,['capture','settlement'])) {
            if ($order->status !== 'paid') {
                $this->finalizePaid($order,$order->user_id);
            }
        } elseif (in_array($status,['cancel','deny','expire'])) {
            $order->status = 'cancelled';
            $order->save();
        }

        return response()->json(['message'=>'Notification processed','order_status'=>$order->status],200);
    }

    /**
     * Shared finalize logic: set status paid, decrement stock, clear cart once.
     */
    private function finalizePaid(Order $order, int $userId): void
    {
        // Guard: do nothing if already paid
        if ($order->status === 'paid') {
            return;
        }

        // Mark as paid; do NOT mark complete here (user will validate delivery)
        $order->status = 'paid';
        $order->is_complete = false; // ensure waiting for delivery validation
        $order->save();

        // Reduce stock (only once)
        foreach ($order->items()->with('product')->get() as $it) {
            if ($it->product) {
                Product::where('id', $it->product_id)
                    ->where('stock', '>=', $it->quantity)
                    ->decrement('stock', (int) $it->quantity);
            }
        }

        // Clear cart
        $cartId = DB::table('carts')->where('user_id', $userId)->value('id');
        if ($cartId) {
            DB::table('cart_items')->where('cart_id', $cartId)->delete();
            DB::table('carts')->where('id', $cartId)->update([
                'total_price' => 0,
                'updated_at'  => now(),
            ]);
        }
    }

    // GET /api/orders/my
    public function myOrders(Request $request)
    {
        $user = $request->user();

        // Raw orders for user
        $orders = DB::table('orders')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get();

        if ($orders->isEmpty()) {
            return response()->json([], 200);
        }

        // Preload all order_items + products in one go
        $orderIds = $orders->pluck('id')->all();
        $itemsRaw = DB::table('order_items')
            ->whereIn('order_id', $orderIds)
            ->get();

        $productIds = $itemsRaw->pluck('product_id')->unique()->all();
        $products = Product::whereIn('id', $productIds)->get()
            ->keyBy('id');

        $groupedItems = [];
        foreach ($itemsRaw as $row) {
            $prod = $products->get($row->product_id);
            $groupedItems[$row->order_id][] = [
                'id'         => $row->id,
                'product_id' => $row->product_id,
                'quantity'   => (int) $row->quantity,
                'price'      => (float) $row->price,
                'total'      => (float) $row->price * (int) $row->quantity,
                'product'    => $prod ? [
                    'id' => $prod->id,
                    'name' => $prod->name,
                    'slug' => $prod->slug,
                    'main_image_url' => $prod->main_image_url,
                ] : null,
            ];
        }

        $result = $orders->map(function ($o) use ($groupedItems) {
            $items = $groupedItems[$o->id] ?? [];
            return [
                'id'          => $o->id,
                'order_code'  => $o->order_code,
                'status'      => $o->status,
                'is_complete' => (bool) $o->is_complete, // added
                'total_price' => (float) $o->total_price,
                'created_at'  => $o->created_at,
                'items'       => $items,
            ];
        });

        return response()->json($result, 200);
    }

    // GET /api/orders/{order_code}
    public function showOrder(Request $request, string $orderCode)
    {
        $user = $request->user();
        $order = Order::where('order_code', $orderCode)
            ->where('user_id', $user->id)
            ->with(['address','items.product'])
            ->first();

        if (!$order) {
            return response()->json(['message'=>'Order not found'],404);
        }

        $items = $order->items->map(function ($it) {
            return [
                'id'         => $it->id,
                'product_id' => $it->product_id,
                'quantity'   => (int)$it->quantity,
                'price'      => (float)$it->price,
                'total'      => (float)$it->price * (int)$it->quantity,
                'product'    => $it->product ? [
                    'id' => $it->product->id,
                    'name' => $it->product->name,
                    'slug' => $it->product->slug,
                    'main_image_url' => $it->product->main_image_url,
                ] : null,
            ];
        });

        $subtotal = $items->sum('total');
        $shippingFee = max(0, (float)$order->total_price - (float)$subtotal);
        $courierRow = DB::table('couriers')->where('id',$order->courier_id)->first();
        $courier = $courierRow ? [
            'id' => $courierRow->id,
            'name' => $courierRow->name ?? ($courierRow->code ?? 'Courier'),
            'code' => $courierRow->code ?? null,
            'price' => isset($courierRow->price) ? (float)$courierRow->price : (float)$shippingFee,
        ] : null;

        return response()->json([
            'id'          => $order->id,
            'order_code'  => $order->order_code,
            'status'      => $order->status,
            'is_complete' => (bool) $order->is_complete, // added
            'total_price' => (float)$order->total_price,
            'subtotal'    => (float)$subtotal,
            'shipping_fee'=> (float)$shippingFee,
            'created_at'  => $order->created_at,
            'address'     => $order->address ? [
                'id' => $order->address->id,
                'nama_tempat' => $order->address->nama_tempat,
                'no_telp' => $order->address->no_telp,
                'alamat' => $order->address->alamat,
                'kecamatan' => $order->address->kecamatan,
                'kabupaten' => $order->address->kabupaten,
                'provinsi' => $order->address->provinsi,
            ] : null,
            'courier'     => $courier,
            'items'       => $items,
        ],200);
    }

    /**
     * User confirms delivery: set is_complete=1 for their shipped/completed order.
     * POST /api/orders/confirm-delivery {order_code}
     */
    public function confirmDelivery(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'order_code' => ['required','string'],
        ]);

        $order = Order::where('order_code',$data['order_code'])
            ->where('user_id',$user->id)
            ->first();

        if (!$order) return response()->json(['message'=>'Order not found'],404);

        // New flow: user validates only when status to receive (or completes missing is_complete).
        if ($order->status === 'to receive') {
            $order->status = 'completed';
            $order->is_complete = true;
            $order->save();
            return response()->json([
                'message'=>'Delivery confirmed. Order completed.',
                'status'=>$order->status,
                'is_complete'=>true
            ],200);
        }

        if ($order->status === 'completed' && !$order->is_complete) {
            $order->is_complete = true;
            $order->save();
            return response()->json([
                'message'=>'Completion flag updated.',
                'status'=>$order->status,
                'is_complete'=>true
            ],200);
        }

        return response()->json(['message'=>'Order is not ready for confirmation'],422);
    }

    /**
     * User cancels an order (pending or paid, not yet shipped).
     * POST /api/orders/cancel {order_code, reason}
     */
    public function cancelOrder(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'order_code' => ['required','string'],
            'reason'     => ['required','string','min:3'],
        ]);

        $order = Order::where('order_code',$data['order_code'])
            ->where('user_id',$user->id)
            ->first();

        if (!$order) return response()->json(['message'=>'Order not found'],404);

        if (in_array($order->status, ['shipped','to receive','completed','cancelled'])) {
            return response()->json(['message'=>'Order cannot be cancelled at this stage.'],422);
        }

        DB::transaction(function () use ($order, $data) {
            // If paid, restore stock (we decremented on payment)
            if ($order->status === 'paid') {
                foreach ($order->items()->get() as $it) {
                    DB::table('products')
                        ->where('id',$it->product_id)
                        ->increment('stock', (int)$it->quantity);
                }
            }
            $order->status = 'cancelled';
            $order->cancel = $data['reason'];
            $order->save();
        });

        return response()->json([
            'message'=>'Order cancelled.',
            'order'=>[
                'order_code'=>$order->order_code,
                'status'=>$order->status,
                'cancel'=>$order->cancel,
            ]
        ],200);
    }
}
