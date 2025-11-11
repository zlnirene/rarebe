<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Review;
use App\Models\Product;

class ReviewController extends Controller
{
    // Public: GET /api/reviews?product_id=...
    public function index(Request $request)
    {
        $q = Review::query()->orderByDesc('id');
        if ($request->filled('product_id')) $q->where('product_id', (int)$request->get('product_id'));
        return response()->json($q->get(),200);
    }

    // GET /api/reviews/mine
    public function mine(Request $request)
    {
        $user = $request->user();
        $list = Review::where('user_id',$user->id)->orderByDesc('id')->get();
        return response()->json($list,200);
    }

    // POST /api/reviews
    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'product_id' => ['required','exists:products,id'],
            'rating' => ['required','integer','min:1','max:5'],
            'review' => ['nullable','string'],
        ]);
        $product = Product::find($data['product_id']);
        if (!$product) return response()->json(['message'=>'Product not found'],404);
        $r = Review::create([
            'product_id'=>$data['product_id'],
            'user_id'=>$user->id,
            'rating'=>$data['rating'],
            'review'=>$data['review'] ?? null,
        ]);
        return response()->json($r,201);
    }

    // PUT /api/reviews/{review}
    public function update(Request $request, Review $review)
    {
        $user = $request->user();
        if ($review->user_id !== $user->id) return response()->json(['message'=>'Forbidden'],403);
        $data = $request->validate([
            'rating' => ['sometimes','required','integer','min:1','max:5'],
            'review' => ['sometimes','nullable','string'],
        ]);
        $review->fill($data);
        $review->save();
        return response()->json($review->fresh(),200);
    }

    // DELETE /api/reviews/{review}
    public function destroy(Request $request, Review $review)
    {
        $user = $request->user();
        if ($review->user_id !== $user->id && !in_array($user->role, ['admin','superadmin'])) {
            return response()->json(['message'=>'Forbidden'],403);
        }
        $review->delete();
        return response()->json(['message'=>'Deleted'],200);
    }
}
