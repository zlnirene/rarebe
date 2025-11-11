<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
	// Public: GET /api/products
	public function index(Request $request)
	{
		$q = Product::query()->with('category')->where('is_active', 1);

		if ($request->filled('search')) {
			$term = $request->get('search');
			$q->where('name', 'like', "%{$term}%");
		}
		// pagination optional
		$list = $q->orderByDesc('id')->get();
		return response()->json($list, 200);
	}

	// Public: GET /api/products/{product}
	public function show(Product $product)
	{
		if (!$product->is_active) return response()->json(['message'=>'Product inactive'], 404);
		$product->load('images','category','reviews');
		return response()->json($product, 200);
	}

	// Admin: GET /api/admin/products
	public function adminIndex(Request $request)
	{
		$user = $request->user();
		if (!$user || !in_array($user->role, ['admin','superadmin'])) {
			return response()->json(['message'=>'Forbidden'], 403);
		}
		$q = Product::query()->with('category')->orderByDesc('id');
		if ($request->filled('search')) {
			$term = $request->get('search');
			$q->where('name', 'like', "%{$term}%");
		}
		$list = $q->get();
		return response()->json($list, 200);
	}

	// Admin: store
	public function store(Request $request)
	{
		$user = $request->user();
		if (!$user || !in_array($user->role, ['admin','superadmin'])) {
			return response()->json(['message'=>'Forbidden'], 403);
		}
		$data = $request->validate([
			'category_id' => ['nullable','integer','exists:categories,id'],
			'name' => ['required','string','max:255'],
			'description' => ['nullable','string'],
			'price' => ['required','numeric'],
			'modal_price' => ['nullable','numeric'],
			'stock' => ['nullable','integer'],
			'is_new' => ['sometimes','boolean'],
			'is_best_seller' => ['sometimes','boolean'],
			'is_active' => ['sometimes','boolean'],
			'main_image' => ['nullable','file','image','max:5120'],
		]);

		// Remove file from mass-assignment payload to avoid storing UploadedFile object
		$file = $data['main_image'] ?? null;
		if (array_key_exists('main_image', $data)) unset($data['main_image']);

		$product = new Product($data);
		$product->slug = Str::slug($data['name']);
		$product->save();

		if ($file && $request->hasFile('main_image')) {
			$path = $request->file('main_image')->store('images/products','public');
			$product->main_image = preg_replace('#^public/#','', $path);
			$product->save();
		}

		return response()->json($product->fresh(), 201);
	}

	// Admin: update
	public function update(Request $request, Product $product)
	{
		$user = $request->user();
		if (!$user || !in_array($user->role, ['admin','superadmin'])) {
			return response()->json(['message'=>'Forbidden'], 403);
		}
		$data = $request->validate([
			'category_id' => ['nullable','integer','exists:categories,id'],
			'name' => ['required','string','max:255'],
			'description' => ['nullable','string'],
			'price' => ['required','numeric'],
			'modal_price' => ['nullable','numeric'],
			'stock' => ['nullable','integer'],
			'is_new' => ['sometimes','boolean'],
			'is_best_seller' => ['sometimes','boolean'],
			'is_active' => ['sometimes','boolean'],
			'main_image' => ['nullable','file','image','max:5120'],
		]);

		// Extract/clear file from $data before fill()
		$file = $data['main_image'] ?? null;
		if (array_key_exists('main_image', $data)) unset($data['main_image']);

		$product->fill($data);
		$product->slug = Str::slug($data['name']);

		if ($file && $request->hasFile('main_image')) {
			$path = $request->file('main_image')->store('images/products','public');
			$product->main_image = preg_replace('#^public/#','', $path);
		}
		$product->save();

		return response()->json($product->fresh(), 200);
	}

	// Admin: destroy
	public function destroy(Request $request, Product $product)
	{
		$user = $request->user();
		if (!$user || $user->role !== 'superadmin') {
			return response()->json(['message'=>'Forbidden'], 403);
		}
		$product->delete();
		return response()->json(['message'=>'Deleted'], 200);
	}
}
