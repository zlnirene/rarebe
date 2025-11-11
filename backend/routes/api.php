<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\OrdersController;
use App\Http\Controllers\GoogleOAuthController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\AdminUserController;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Review;
use App\Models\ProductImage;

// Route::get('/health', fn () => response()->json(['status' => 'ok'], 200));

// Helper: OAuth meta (copy these to your provider console)
Route::get('/oauth/meta', function (Request $request) {
    $apiBase = rtrim(config('app.url') ?: $request->getSchemeAndHttpHost(), '/');
    $front = rtrim((string)($request->query('front_origin') ?? $request->headers->get('Origin') ?? 'http://localhost:3000'), '/');

    return response()->json([
        'authorized_js_origins' => [$front],
        'authorized_redirect_uris' => [
            $apiBase . '/auth/google/callback',
            $apiBase . '/auth/facebook/callback',
        ],
    ], 200);
});

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/admin/login', [AuthController::class, 'adminLogin']);
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/auth/resend-otp', [AuthController::class, 'resendOtp']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/auth/verify-reset-otp', [AuthController::class, 'verifyResetOtp']);
Route::post('/google-login', [AuthController::class, 'googleLogin']);

Route::middleware('auth:sanctum')->group(function () {
    // Admin category CRUD
    Route::get('/admin/categories', [CategoryController::class, 'adminIndex']);
    Route::post('/admin/categories', [CategoryController::class, 'store']);
    Route::post('/admin/categories/{category}', [CategoryController::class, 'update']); // expects ?_method=PUT
    Route::put('/admin/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/admin/categories/{category}', [CategoryController::class, 'destroy']);

    // Admin product CRUD
    Route::get('/admin/products', [ProductController::class, 'adminIndex']);
    Route::post('/admin/products', [ProductController::class, 'store']);
    Route::post('/admin/products/{product}', [ProductController::class, 'update']); // expects ?_method=PUT
    Route::put('/admin/products/{product}', [ProductController::class, 'update']);
    Route::delete('/admin/products/{product}', [ProductController::class, 'destroy']);

    // Profile (authenticated user)
    Route::get('/profile', [UserController::class, 'profile']);
    Route::post('/profile/password', [UserController::class, 'changePassword']);

    // Update profile (name/email)
    Route::put('/profile', function (Request $request) {
        $user = $request->user();
        $data = $request->validate([
            'name'  => ['sometimes','required','string','max:255','regex:/^[\pL\s]+$/u'], // letters and spaces only
            'email' => ['sometimes','required','email','max:255','unique:users,email,' . $user->id],
        ],[
            'name.regex' => 'Nama harus angka',
        ]);
        if (array_key_exists('name', $data)) {
            $user->name = $data['name'];
        }
        if (array_key_exists('email', $data)) {
            $user->email = strtolower(trim($data['email']));
        }
        $user->save();
        return response()->json(['user' => $user], 200);
    });

    // Addresses (CRUD for authenticated user)
    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::get('/addresses/{address}', [AddressController::class, 'show']);
    Route::put('/addresses/{address}', [AddressController::class, 'update']);
    Route::patch('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);

    // Admin customers CRUD (role=customer only)
    Route::get('/admin/customers', [CustomerController::class, 'index']);
    Route::get('/admin/customers/{user}', [CustomerController::class, 'show']);
    Route::post('/admin/customers', [CustomerController::class, 'store']);
    Route::put('/admin/customers/{user}', [CustomerController::class, 'update']);
    Route::patch('/admin/customers/{user}', [CustomerController::class, 'update']);
    Route::delete('/admin/customers/{user}', [CustomerController::class, 'destroy']);

    // Cart
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart/add', [CartController::class, 'add']);
    Route::patch('/cart/item/{id}', [CartController::class, 'updateItem']);
    Route::delete('/cart/item/{id}', [CartController::class, 'removeItem']);
    Route::post('/cart/clear', [CartController::class, 'clear']);
    Route::get('/cart/summary', [CartController::class, 'summary']);

    // Reviews
    Route::get('/reviews', [ReviewController::class, 'index']); // public list by product_id
    Route::get('/reviews/mine', [ReviewController::class, 'mine']);
    Route::post('/reviews', [ReviewController::class, 'store']);
    Route::put('/reviews/{review}', [ReviewController::class, 'update']);
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroy']);

    // Checkout
    Route::get('/checkout/init', [CheckoutController::class, 'init']);
    Route::post('/checkout/place', [CheckoutController::class, 'place']);
    Route::post('/checkout/pay', [CheckoutController::class, 'pay']);
    Route::post('/checkout/confirm', [CheckoutController::class, 'confirm']);

    // Orders (history for current user)
    Route::get('/orders/my', [CheckoutController::class, 'myOrders']);
    Route::get('/orders/{order_code}', [CheckoutController::class, 'showOrder']);
    Route::post('/orders/confirm-delivery', [CheckoutController::class, 'confirmDelivery']);
    Route::post('/orders/cancel', [CheckoutController::class, 'cancelOrder']);

    // Admin orders
    Route::get('/admin/orders',[OrdersController::class,'index']);
    Route::get('/admin/orders/{order}',[OrdersController::class,'show']);
    Route::patch('/admin/orders/{order}/mark-shipped',[OrdersController::class,'markShipped']);
    Route::patch('/admin/orders/{order}/mark-to-receive',[OrdersController::class,'markToReceive']);
    Route::patch('/admin/orders/{order}/mark-completed',[OrdersController::class,'markCompleted']);

    // Product Images (admin)
    Route::get('/admin/products/{product}/images', [ProductImageController::class,'adminIndex']);
    Route::post('/admin/products/{product}/images', [ProductImageController::class,'store']);
    Route::patch('/admin/products/{product}/images/{image}/primary', [ProductImageController::class,'setPrimary']);
    Route::delete('/admin/products/{product}/images/{image}', [ProductImageController::class,'destroy']);

    // Admin: dashboard stats (capital, omzet, recent orders)
    Route::get('/admin/dashboard-stats', function (Request $request) {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin','superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $capital = (float) (DB::table('products')
            ->selectRaw('COALESCE(SUM(modal_price * stock), 0) as capital')
            ->value('capital') ?? 0);

        $revenue = (float) (DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', ['paid','shipped','to receive','completed'])
            ->selectRaw('COALESCE(SUM(order_items.price * order_items.quantity), 0) as omzet')
            ->value('omzet') ?? 0);

        $sold_qty = (int) (DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', ['paid','shipped','to receive','completed'])
            ->sum('order_items.quantity') ?? 0);

        $active_products = (int) DB::table('products')->where('is_active', 1)->count();

        $paid_orders_count = (int) DB::table('orders')->where('status', 'paid')->count();

        $recent = DB::table('orders')
            ->join('users', 'users.id', '=', 'orders.user_id')
            ->orderByDesc('orders.id')
            ->limit(10)
            ->get([
                'orders.id',
                'orders.order_code',
                'orders.total_price',
                'orders.status',
                'orders.created_at',
                'users.name as user_name',
                'users.email as user_email',
            ]);

        return response()->json([
            'capital' => $capital,
            'revenue' => $revenue,
            'sold_qty' => $sold_qty,
            'active_products' => $active_products,
            'paid_orders_count' => $paid_orders_count,
            'recent_orders' => $recent,
        ], 200);
    });

    // Optional: couriers list (used by frontend if needed)
    Route::get('/couriers', function () {
        return DB::table('couriers')->get();
    });

    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Superadmin: manage admin users
    Route::get('/superadmin/admin-users', [AdminUserController::class, 'index']);
    Route::post('/superadmin/admin-users', [AdminUserController::class, 'store']);
    Route::put('/superadmin/admin-users/{user}', [AdminUserController::class, 'update']);
    Route::patch('/superadmin/admin-users/{user}', [AdminUserController::class, 'update']);
    Route::delete('/superadmin/admin-users/{user}', [AdminUserController::class, 'destroy']);
});

// Midtrans server-to-server notification (no auth)
Route::post('/midtrans/notify', [CheckoutController::class, 'notify']);

// Public: categories
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);

// Public: products (generic)
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);

// Public: shop products with filters (category by ID only)
Route::get('/shop/products', function (Request $request) {
    $q = Product::query()
        ->with('category')
        ->where('is_active', 1);

    $catParam = $request->query('category_id') ?? $request->query('category');
    if (is_numeric($catParam)) {
        $q->where('category_id', (int) $catParam);
    }

    $term = trim((string)($request->query('q') ?? $request->query('search') ?? ''));
    if ($term !== '') {
        $q->where('name', 'like', "%{$term}%");
    }

    if (in_array((string)$request->query('is_best_seller'), ['1','true'], true)) {
        $q->where('is_best_seller', 1);
    }
    if (in_array((string)$request->query('is_new'), ['1','true'], true)) {
        $q->where('is_new', 1);
    }

    $min = $request->query('min_price');
    $max = $request->query('max_price');
    if (is_numeric($min)) $q->where('price', '>=', (float)$min);
    if (is_numeric($max)) $q->where('price', '<=', (float)$max);

    $sort = (string)($request->query('sort') ?? '');
    switch ($sort) {
        case 'price_asc':  $q->orderBy('price', 'asc'); break;
        case 'price_desc': $q->orderBy('price', 'desc'); break;
        case 'newest':     $q->orderByDesc('id'); break;
        default:           $q->orderByDesc('id'); break;
    }

    return response()->json($q->get(), 200);
});
// (ShopController routes removed — frontend uses /shop/products and /products/{product} endpoints)

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Public list images for a product
Route::get('/products/{product}/images', [ProductImageController::class,'publicIndex']);

// Public product extended details (images, sold_count, reviews, average_rating)
Route::get('/products/{product}/details', function (Request $request, Product $product) {
    if (!$product->is_active) {
        return response()->json(['message' => 'Product inactive'], 404);
    }

    $images = ProductImage::where('product_id', $product->id)
        ->orderBy('sort_order')
        ->orderByDesc('id')
        ->get()
        ->map(fn ($img) => [
            'id' => $img->id,
            'image_url' => $img->image_url,
            'is_primary' => (bool)$img->is_primary,
        ]);

    $soldCount = OrderItem::query()
        ->join('orders', 'orders.id', '=', 'order_items.order_id')
        ->where('order_items.product_id', $product->id)
        ->whereIn('orders.status', ['paid','shipped','to receive','completed'])
        ->sum('order_items.quantity');

    $reviews = Review::where('product_id', $product->id)
        ->orderByDesc('id')
        ->limit(25)
        ->get()
        ->map(fn ($r) => [
            'id' => $r->id,
            'rating' => (int)$r->rating,
            'review' => $r->review,
            'comment' => $r->review,
            'user_name' => $r->user?->name,
            'created_at' => $r->created_at,
        ]);

    $avg = $reviews->count() ? round($reviews->avg('rating'), 2) : null;

    return response()->json([
        'product_id' => $product->id,
        'sold_count' => (int)$soldCount,
        'average_rating' => $avg,
        'reviews' => $reviews,
        'images' => $images,
    ], 200);
});

// Public reviews (full list optional)
Route::get('/products/{product}/reviews', function (Request $request, Product $product) {
    $reviews = Review::where('product_id', $product->id)
        ->orderByDesc('id')
        ->get()
        ->map(fn ($r) => [
            'id' => $r->id,
            'rating' => (int)$r->rating,
            'review' => $r->review,
            'comment' => $r->review,
            'user_name' => $r->user?->name,
            'created_at' => $r->created_at,
        ]);
    return response()->json($reviews, 200);
});
