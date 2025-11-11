<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Address;

class AddressController extends Controller
{
    // Allow owner or admin/superadmin
    private function authorizeOwnerOrAdmin(Request $request, ?Address $address = null)
    {
        $user = $request->user();
        if ($user && in_array($user->role, ['admin', 'superadmin'])) {
            return;
        }
        if ($address && $address->user_id !== $user->id) {
            abort(response()->json(['message' => 'Forbidden'], 403));
        }
    }

    // GET /api/addresses  (user's addresses; admin may supply ?user_id=)
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user && in_array($user->role, ['admin', 'superadmin'])) {
            $q = Address::query()->orderByDesc('id');
            if ($request->filled('user_id')) {
                $q->where('user_id', (int) $request->get('user_id'));
            }
            return response()->json($q->get(), 200);
        }

        $list = Address::where('user_id', $user->id)->orderByDesc('id')->get();
        return response()->json($list, 200);
    }

    // POST /api/addresses
    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'nama_tempat' => ['required', 'string', 'max:255'],
            'no_telp'     => ['required', 'string', 'max:50'],
            'alamat'      => ['required', 'string', 'max:2000'],
            'kecamatan'   => ['required', 'string', 'max:255'],
            'kabupaten'   => ['required', 'string', 'max:255'],
            'provinsi'    => ['required', 'string', 'max:255'],
            'is_primary'  => ['sometimes', 'boolean'],
        ]);

        $data['user_id'] = $user->id;
        $data['is_primary'] = (bool) ($data['is_primary'] ?? false);

        $address = DB::transaction(function () use ($data, $user) {
            if ($data['is_primary']) {
                Address::where('user_id', $user->id)->update(['is_primary' => false]);
            }
            return Address::create($data);
        });

        return response()->json($address, 201);
    }

    // GET /api/addresses/{address}
    public function show(Request $request, Address $address)
    {
        $this->authorizeOwnerOrAdmin($request, $address);
        return response()->json($address, 200);
    }

    // PUT/PATCH /api/addresses/{address}
    public function update(Request $request, Address $address)
    {
        $this->authorizeOwnerOrAdmin($request, $address);

        $data = $request->validate([
            'nama_tempat' => ['sometimes', 'required', 'string', 'max:255'],
            'no_telp'     => ['sometimes', 'required', 'string', 'max:50'],
            'alamat'      => ['sometimes', 'required', 'string', 'max:2000'],
            'kecamatan'   => ['sometimes', 'required', 'string', 'max:255'],
            'kabupaten'   => ['sometimes', 'required', 'string', 'max:255'],
            'provinsi'    => ['sometimes', 'required', 'string', 'max:255'],
            'is_primary'  => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($data, $address) {
            if (array_key_exists('is_primary', $data) && $data['is_primary']) {
                Address::where('user_id', $address->user_id)->update(['is_primary' => false]);
                $address->is_primary = true;
            }
            foreach ($data as $k => $v) {
                if ($k === 'is_primary') continue; // handled
                $address->{$k} = $v;
            }
            $address->save();
        });

        return response()->json($address->fresh(), 200);
    }

    // DELETE /api/addresses/{address}
    public function destroy(Request $request, Address $address)
    {
        $this->authorizeOwnerOrAdmin($request, $address);

        // If deleting primary, optionally make another primary (first available)
        DB::transaction(function () use ($address) {
            $wasPrimary = (bool) $address->is_primary;
            $userId = $address->user_id;
            $address->delete();
            if ($wasPrimary) {
                $next = Address::where('user_id', $userId)->orderByDesc('id')->first();
                if ($next) {
                    $next->is_primary = true;
                    $next->save();
                }
            }
        });

        return response()->json(['message' => 'Deleted'], 200);
    }
}
