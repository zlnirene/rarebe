<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductVariantController extends Controller
{
    private function ensureAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            abort(response()->json(['message' => 'Forbidden'], 403));
        }
    }

    // GET /api/admin/variants?product_id=...
    public function index(Request $request)
    {
        $this->ensureAdmin($request);

        $q = ProductVariant::query()
            ->with(['product:id,name'])
            ->orderByDesc('id');

        if ($request->filled('product_id')) {
            $q->where('product_id', (int) $request->get('product_id'));
        }

        if ($request->filled('search')) {
            $term = trim($request->get('search'));
            $q->where(function ($w) use ($term) {
                $w->where('variant_name', 'like', "%{$term}%")
                  ->orWhere('sku', 'like', "%{$term}%");
            });
        }

        return response()->json($q->get(), 200);
    }

    // POST /api/admin/variants
    public function store(Request $request)
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'product_id'    => ['required', 'exists:products,id'],
            'variant_name'  => ['required', 'string', 'max:255'],
            'sku'           => ['nullable', 'string', 'max:255', 'unique:product_variant,sku'],
            'stock'         => ['required', 'integer', 'min:0'],
            'is_active'     => ['sometimes', 'boolean'],
            'variant_image' => ['nullable', 'image', 'max:4096'],
        ]);

        // Ensure product exists and is active (optional)
        $product = Product::find($data['product_id']);
        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $variant = new ProductVariant();
        $variant->product_id = $data['product_id'];
        $variant->variant_name = $data['variant_name'];
        $variant->sku = $data['sku'] ?? null; // will auto-generate on model boot if empty
        $variant->stock = $data['stock'];
        $variant->is_active = array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true;

        if ($request->hasFile('variant_image')) {
            $file = $request->file('variant_image');
            $filename = uniqid('var_') . '.' . $file->getClientOriginalExtension();
            $dest = public_path('images/variants');
            if (!is_dir($dest)) {
                @mkdir($dest, 0755, true);
            }
            $file->move($dest, $filename);
            $variant->variant_image = 'variants/' . $filename; // relative to /images
        }

        $variant->save();
        $variant->load('product:id,name');

        return response()->json($variant, 201);
    }

    // PUT/PATCH /api/admin/variants/{variant}
    public function update(Request $request, ProductVariant $variant)
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'product_id'    => ['required', 'exists:products,id'],
            'variant_name'  => ['required', 'string', 'max:255'],
            'sku'           => ['nullable', 'string', 'max:255', Rule::unique('product_variant', 'sku')->ignore($variant->id)],
            'stock'         => ['required', 'integer', 'min:0'],
            'is_active'     => ['sometimes', 'boolean'],
            'variant_image' => ['nullable', 'image', 'max:4096'],
        ]);

        $variant->product_id = $data['product_id'];
        $variant->variant_name = $data['variant_name'];
        $variant->sku = $data['sku'] ?? $variant->sku;
        $variant->stock = $data['stock'];
        if ($request->has('is_active')) {
            $variant->is_active = (bool) $data['is_active'];
        }

        if ($request->hasFile('variant_image')) {
            if ($variant->variant_image) {
                @unlink(public_path('images/' . ltrim($variant->variant_image, '/')));
            }
            $file = $request->file('variant_image');
            $filename = uniqid('var_') . '.' . $file->getClientOriginalExtension();
            $dest = public_path('images/variants');
            if (!is_dir($dest)) {
                @mkdir($dest, 0755, true);
            }
            $file->move($dest, $filename);
            $variant->variant_image = 'variants/' . $filename;
        }

        $variant->save();
        $variant->load('product:id,name');

        return response()->json($variant, 200);
    }

    // DELETE /api/admin/variants/{variant}
    public function destroy(Request $request, ProductVariant $variant)
    {
        $this->ensureAdmin($request);

        if ($variant->variant_image) {
            @unlink(public_path('images/' . ltrim($variant->variant_image, '/')));
        }
        $variant->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }
}
