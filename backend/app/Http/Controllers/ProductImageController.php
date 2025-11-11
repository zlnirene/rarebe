<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Support\Facades\Storage;

class ProductImageController extends Controller
{
    // Admin: list images
    public function adminIndex(Request $request, Product $product)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin','superadmin'])) return response()->json(['message'=>'Forbidden'],403);
        $images = ProductImage::where('product_id', $product->id)->orderBy('sort_order')->orderByDesc('id')->get();
        return response()->json($images,200);
    }

    // Admin: upload image (file: image)
    public function store(Request $request, Product $product)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin','superadmin'])) return response()->json(['message'=>'Forbidden'],403);
        $data = $request->validate(['image' => ['required','image','max:5120'], 'is_primary' => ['sometimes','boolean']]);
        $path = $request->file('image')->store('images/products','public');
        $img = ProductImage::create([
            'product_id' => $product->id,
            'image_url' => str_replace('public/','', $path),
            'is_primary' => (bool) ($data['is_primary'] ?? false),
        ]);
        if ($img->is_primary) {
            ProductImage::where('product_id', $product->id)->where('id','<>',$img->id)->update(['is_primary'=>false]);
        }
        return response()->json($img,201);
    }

    // Admin: set primary
    public function setPrimary(Request $request, Product $product, ProductImage $image)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin','superadmin'])) return response()->json(['message'=>'Forbidden'],403);
        if ($image->product_id !== $product->id) return response()->json(['message'=>'Mismatch'],422);
        ProductImage::where('product_id', $product->id)->update(['is_primary'=>false]);
        $image->is_primary = true;
        $image->save();
        return response()->json(['message'=>'Set primary'],200);
    }

    // Admin: delete image
    public function destroy(Request $request, Product $product, ProductImage $image)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin','superadmin'])) return response()->json(['message'=>'Forbidden'],403);
        if ($image->product_id !== $product->id) return response()->json(['message'=>'Mismatch'],422);
        // attempt unlink from storage if present
        try { Storage::disk('public')->delete($image->image_url); } catch (\Throwable $e) {}
        $image->delete();
        return response()->json(['message'=>'Deleted'],200);
    }

    // Public: list images for product
    public function publicIndex(Product $product)
    {
        $images = ProductImage::where('product_id', $product->id)->orderBy('sort_order')->orderByDesc('id')->get();
        return response()->json($images,200);
    }
}
