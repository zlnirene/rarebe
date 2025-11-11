<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class CustomerController extends Controller
{
    private function ensureAdmin(Request $request)
    {
        $u = $request->user();
        if (!$u || !in_array($u->role, ['admin','superadmin'])) abort(response()->json(['message'=>'Forbidden'],403));
    }

    public function index(Request $request)
    {
        $this->ensureAdmin($request);
        $q = User::where('role','customer')->orderByDesc('id');
        if ($request->filled('search')) {
            $s = $request->get('search');
            $q->where(function($w) use ($s) {
                $w->where('name','like',"%{$s}%")->orWhere('email','like',"%{$s}%");
            });
        }
        return response()->json($q->get(), 200);
    }

    public function show(Request $request, User $user)
    {
        $this->ensureAdmin($request);
        if ($user->role !== 'customer') return response()->json(['message'=>'Not a customer'],404);
        return response()->json($user,200);
    }

    public function store(Request $request)
    {
        $this->ensureAdmin($request);
        $data = $request->validate([
            'name'=>['required','string','max:255'],
            'email'=>['required','email','unique:users,email'],
            'password'=>['required','string','min:6'],
            'is_active'=>['sometimes','boolean'],
        ]);
        $user = User::create([
            'name'=>$data['name'],
            'email'=>strtolower(trim($data['email'])),
            'password'=>Hash::make($data['password']),
            'role'=>'customer',
            'is_active'=> $data['is_active'] ?? true,
        ]);
        return response()->json($user,201);
    }

    public function update(Request $request, User $user)
    {
        $this->ensureAdmin($request);
        if ($user->role !== 'customer') return response()->json(['message'=>'Not a customer'],404);
        $data = $request->validate([
            'name'=>['sometimes','required','string','max:255'],
            'email'=>['sometimes','required','email','unique:users,email,'.$user->id],
            'password'=>['sometimes','nullable','string','min:6'],
            'is_active'=>['sometimes','boolean'],
        ]);
        if (array_key_exists('name',$data)) $user->name = $data['name'];
        if (array_key_exists('email',$data)) $user->email = strtolower(trim($data['email']));
        if (!empty($data['password'])) $user->password = Hash::make($data['password']);
        if (array_key_exists('is_active',$data)) $user->is_active = (bool)$data['is_active'];
        $user->save();
        return response()->json($user->fresh(),200);
    }

    public function destroy(Request $request, User $user)
    {
        $this->ensureAdmin($request);
        if ($user->role !== 'customer') return response()->json(['message'=>'Not a customer'],404);
        $user->delete();
        return response()->json(['message'=>'Deleted'],200);
    }
}
