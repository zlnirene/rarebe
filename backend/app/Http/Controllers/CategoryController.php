<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Category;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    private function ensureAdmin(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            abort(response()->json(['message' => 'Forbidden'], 403));
        }
    }

    // Public: GET /api/categories
    public function index(Request $request)
    {
        // Public list: only active categories for shop
        $q = Category::query()->orderBy('name', 'asc');
        if ($request->query('only_active', '1') !== '0') {
            $q->where('is_active', 1);
        }
        $list = $q->get()->map(function ($c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'description' => $c->description,
                'image_url' => $c->image_url ?? null,
                'is_active' => (bool)$c->is_active,
            ];
        });
        return response()->json($list, 200);
    }

    // Public: GET /api/categories/{category}
    public function show(Category $category)
    {
        return response()->json([
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'image_url' => $category->image_url ?? null,
            'is_active' => (bool)$category->is_active,
        ], 200);
    }

    // Admin: list (GET /api/admin/categories)
    public function adminIndex(Request $request)
    {
        $this->ensureAdmin($request);

        $q = Category::query()->orderByDesc('id');

        if ($request->filled('search')) {
            $term = trim($request->get('search'));
            $q->where('name', 'like', "%{$term}%");
        }

        $list = $q->get()->map(function ($c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'description' => $c->description,
                'image_url' => $c->image_url ?? null,
                'is_active' => (bool)$c->is_active,
            ];
        });

        return response()->json($list, 200);
    }

    // Admin: create (POST /api/admin/categories)
    public function store(Request $request)
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'image', 'max:5120'],
        ]);

        $cat = new Category();
        $cat->name = $data['name'];
        $cat->slug = Str::slug($data['name']);
        $cat->description = $data['description'] ?? null;
        $cat->is_active = array_key_exists('is_active', $data) ? (bool)$data['is_active'] : true;

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = uniqid('cat_') . '.' . $file->getClientOriginalExtension();
            $dest = public_path('images/categories');
            if (!is_dir($dest)) @mkdir($dest, 0755, true);
            $file->move($dest, $filename);
            $cat->image = 'categories/' . $filename;
        }

        $cat->save();

        return response()->json($cat->fresh(), 201);
    }

    // Admin: update (PUT/PATCH /api/admin/categories/{category})
    public function update(Request $request, Category $category)
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'image', 'max:5120'],
        ]);

        $category->name = $data['name'];
        // Update slug only if name changed and no explicit slug provided
        $category->slug = Str::slug($data['name']);
        $category->description = $data['description'] ?? $category->description;
        if (array_key_exists('is_active', $data)) {
            $category->is_active = (bool)$data['is_active'];
        }

        if ($request->hasFile('image')) {
            // remove old
            if ($category->image) {
                @unlink(public_path('images/' . ltrim($category->image, '/')));
            }
            $file = $request->file('image');
            $filename = uniqid('cat_') . '.' . $file->getClientOriginalExtension();
            $dest = public_path('images/categories');
            if (!is_dir($dest)) @mkdir($dest, 0755, true);
            $file->move($dest, $filename);
            $category->image = 'categories/' . $filename;
        }

        $category->save();

        return response()->json($category->fresh(), 200);
    }

    // Admin: delete (DELETE /api/admin/categories/{category})
    public function destroy(Request $request, Category $category)
    {
        $this->ensureAdmin($request);

        if ($category->image) {
            @unlink(public_path('images/' . ltrim($category->image, '/')));
        }

        $category->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }
}
