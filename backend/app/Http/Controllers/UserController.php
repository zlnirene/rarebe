<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
	// GET /api/profile
	public function profile(Request $request)
	{
		$user = $request->user();
		// keep shape compatible with frontend ProfileResponse
		return response()->json([
			'user' => $user,
			'orders' => [], // frontend fetches orders separately (orders/my), keep array for compatibility
		], 200);
	}

	// POST /api/profile/password
	public function changePassword(Request $request)
	{
		$data = $request->validate([
			'current_password' => ['required', 'string'],
			'new_password' => ['required', 'string', 'min:6', 'confirmed'],
		]);

		$user = $request->user();
		if (!$user) {
			return response()->json(['message' => 'Unauthorized'], 401);
		}

		if (!Hash::check($data['current_password'], $user->password)) {
			return response()->json(['message' => 'Current password is incorrect.'], 422);
		}

		$user->password = Hash::make($data['new_password']);
		$user->save();

		return response()->json(['message' => 'Password updated successfully.'], 200);
	}
}
