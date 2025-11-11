<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Product;

class CartController extends Controller
{
    // GET /api/cart
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $cart = DB::table('carts')->where('user_id', $userId)->first();
        if (!$cart) {
            $cartId = DB::table('carts')->insertGetId([
                'user_id' => $userId,
                'total_price' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $cart = DB::table('carts')->where('id', $cartId)->first();
        }

        $items = DB::table('cart_items')
            ->where('cart_id', $cart->id)
            ->get()
            ->map(function ($row) {
                $product = Product::find($row->product_id);
                return [
                    'id' => $row->id,
                    'product_id' => $row->product_id,
                    'quantity' => (int) $row->quantity,
                    'price' => (float) $row->price, // unit price snapshot
                    'total' => (float) $row->price * (int) $row->quantity,
                    'product' => $product ? [
                        'id' => $product->id,
                        'name' => $product->name,
                        'slug' => $product->slug,
                        'main_image_url' => $product->main_image_url,
                    ] : null,
                ];
            });

        $subtotal = $items->sum('total');
        $count = $items->sum(fn ($i) => (int) $i['quantity']);

        // sync cart total with items
        DB::table('carts')->where('id', $cart->id)->update([
            'total_price' => $subtotal,
            'updated_at' => now(),
        ]);

        return response()->json([
            'cart' => [
                'id' => $cart->id,
                'user_id' => $cart->user_id,
                'total_price' => (float) $subtotal,
                'items_count' => (int) $count,
            ],
            'items' => $items,
        ]);
    }

    // POST /api/cart/add
    public function add(Request $request)
    {
        $userId = $request->user()->id;
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        $qty = $data['quantity'] ?? 1;

        $product = Product::where('id', $data['product_id'])->where('is_active', 1)->first();
        if (!$product) {
            return response()->json(['message' => 'Product not found or inactive.'], 422);
        }

        // Ensure cart exists
        $cart = DB::table('carts')->where('user_id', $userId)->first();
        if (!$cart) {
            $cartId = DB::table('carts')->insertGetId([
                'user_id' => $userId,
                'total_price' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $cart = DB::table('carts')->where('id', $cartId)->first();
        }

        // Find existing item ONLY by product_id (variant removed)
        $existing = DB::table('cart_items')->where([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
        ])->first();

        // Stock validation
        $newQty = $existing ? ((int) $existing->quantity + $qty) : $qty;
        if ($newQty > (int) $product->stock) {
            return response()->json(['message' => 'Requested quantity exceeds available stock.'], 422);
        }

        if ($existing) {
            DB::table('cart_items')->where('id', $existing->id)
                ->update(['quantity' => $newQty, 'updated_at' => now()]);
        } else {
            DB::table('cart_items')->insert([
                'cart_id' => $cart->id,
                'product_id' => $product->id,
                'quantity' => $qty,
                'price' => (float) $product->price,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $this->index($request);
    }

    // PATCH /api/cart/item/{id}
    public function updateItem(Request $request, int $id)
    {
        $userId = $request->user()->id;
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $item = DB::table('cart_items')->where('id', $id)->first();
        if (!$item) return response()->json(['message' => 'Item not found'], 404);

        $cart = DB::table('carts')->where('id', $item->cart_id)->first();
        if (!$cart || $cart->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Stock validation
        $product = Product::find($item->product_id);
        if (!$product || !$product->is_active) {
            return response()->json(['message' => 'Product not found or inactive.'], 422);
        }
        if ((int) $data['quantity'] > (int) $product->stock) {
            return response()->json(['message' => 'Requested quantity exceeds available stock.'], 422);
        }

        DB::table('cart_items')
            ->where('id', $id)
            ->update(['quantity' => $data['quantity'], 'updated_at' => now()]);

        return $this->index($request);
    }

    // DELETE /api/cart/item/{id}
    public function removeItem(Request $request, int $id)
    {
        $userId = $request->user()->id;

        $item = DB::table('cart_items')->where('id', $id)->first();
        if (!$item) return response()->json(['message' => 'Item not found'], 404);

        $cart = DB::table('carts')->where('id', $item->cart_id)->first();
        if (!$cart || $cart->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        DB::table('cart_items')->where('id', $id)->delete();

        return $this->index($request);
    }

    // POST /api/cart/clear
    public function clear(Request $request)
    {
        $userId = $request->user()->id;
        $cart = DB::table('carts')->where('user_id', $userId)->first();
        if ($cart) {
            DB::table('cart_items')->where('cart_id', $cart->id)->delete();
            DB::table('carts')->where('id', $cart->id)->update([
                'total_price' => 0,
                'updated_at' => now(),
            ]);
        }
        return $this->index($request);
    }

    // GET /api/cart/summary
    public function summary(Request $request)
    {
        $userId = $request->user()->id;
        $cart = DB::table('carts')->where('user_id', $userId)->first();

        if (!$cart) {
            return response()->json(['items_count' => 0, 'total_price' => 0.0], 200);
        }

        $items = DB::table('cart_items')->where('cart_id', $cart->id)->get();
        $itemsCount = $items->sum('quantity');
        $subtotal = $items->sum(fn ($i) => (float) $i->price * (int) $i->quantity);

        // Use number of rows as the "jenis" (distinct products) count
        $distinctCount = DB::table('cart_items')->where('cart_id', $cart->id)->count();

        return response()->json([
            'items_count' => (int) $distinctCount,
            'total_price' => (float) $subtotal,
        ], 200);
    }
}
