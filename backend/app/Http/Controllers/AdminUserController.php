<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    private function ensureSuperadmin(Request $request): void
    {
        $u = $request->user();
        if (!$u || $u->role !== 'superadmin') {
            abort(response()->json(['message' => 'Forbidden'], 403));
        }
    }

    // GET /api/superadmin/admin-users
    public function index(Request $request)
    {
        $this->ensureSuperadmin($request);
        return response()->json(User::whereIn('role',['admin','superadmin'])->orderByDesc('id')->get(),200);
    }

    // POST /api/superadmin/admin-users  (force role=admin)
    public function store(Request $request)
    {
        $this->ensureSuperadmin($request);

        $data = $request->validate([
            'name'      => ['required','string','max:255'],
            'email'     => ['required','email','max:255','unique:users,email'],
            'password'  => ['required','string','min:6'],
            'role'      => ['required','in:admin,superadmin'],
            'is_active' => ['sometimes','boolean'],
        ]);

        $user = User::create([
            'name'              => $data['name'],
            'email'             => strtolower(trim($data['email'])),
            'password'          => Hash::make($data['password']),
            'role'              => $data['role'],
            'is_active'         => $data['is_active'] ?? true,
            'email_verified_at' => now(),
        ]);

        return response()->json($user, 201);
    }

    // PUT/PATCH /api/superadmin/admin-users/{user} (keep role=admin)
    public function update(Request $request, User $user)
    {
        $this->ensureSuperadmin($request);

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Only admin users editable'], 422);
        }

        $data = $request->validate([
            'name'      => ['sometimes','required','string','max:255'],
            'email'     => ['sometimes','required','email','max:255','unique:users,email,' . $user->id],
            'password'  => ['nullable','string','min:6'],
            'role'      => ['sometimes','in:admin,superadmin'],
            'is_active' => ['sometimes','boolean'],
        ]);

        if (isset($data['name']))  $user->name  = $data['name'];
        if (isset($data['email'])) $user->email = strtolower(trim($data['email']));
        if (!empty($data['password'])) $user->password = Hash::make($data['password']);
        if (array_key_exists('is_active', $data)) $user->is_active = (bool)$data['is_active'];

        $user->role = 'admin'; // reinforce
        $user->save();

        return response()->json($user->fresh(), 200);
    }

    // DELETE /api/superadmin/admin-users/{user}
    public function destroy(Request $request, User $user)
    {
        $this->ensureSuperadmin($request);

        if (!in_array($user->role,['admin','superadmin'])) return response()->json(['message'=>'Not an admin'],422);
        $user->delete();
        return response()->json(['message' => 'Deleted'], 200);
    }
}
