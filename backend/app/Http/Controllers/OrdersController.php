<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Order;

class OrdersController extends Controller
{
    private function ensureAdmin(Request $request)
    {
        $u = $request->user();
        if (!$u || !in_array($u->role, ['admin','superadmin'])) abort(response()->json(['message'=>'Forbidden'],403));
    }

    // GET /api/admin/orders
    public function index(Request $request)
    {
        $this->ensureAdmin($request);
        $q = Order::query()->orderByDesc('id');
        if ($request->filled('status')) $q->where('status',$request->get('status'));
        return response()->json($q->get(),200);
    }

    // GET /api/admin/orders/{order}
    public function show(Request $request, Order $order)
    {
        $this->ensureAdmin($request);
        $order->load('items.product','user','address');
        return response()->json($order,200);
    }

    // PATCH /api/admin/orders/{order}/mark-shipped
    public function markShipped(Request $request, Order $order)
    {
        $this->ensureAdmin($request);
        if ($order->status !== 'paid') return response()->json(['message'=>'Order not paid'],422);
        $order->status = 'shipped';
        $order->save();
        return response()->json(['message'=>'Marked shipped','order'=>$order],200);
    }

    /**
     * PATCH /api/admin/orders/{order}/mark-to-receive
     * Transition shipped -> to receive (awaiting customer validation).
     */
    public function markToReceive(Request $request, Order $order)
    {
        $this->ensureAdmin($request);
        if (!in_array($order->status, ['shipped'])) return response()->json(['message'=>'Invalid status'],422);
        $order->status = 'to receive';
        $order->save();
        return response()->json(['message'=>'Marked to receive','order'=>$order],200);
    }

    // PATCH /api/admin/orders/{order}/mark-completed
    public function markCompleted(Request $request, Order $order)
    {
        $this->ensureAdmin($request);
        if (!in_array($order->status, ['to receive','shipped','paid'])) return response()->json(['message'=>'Invalid status'],422);
        $order->status = 'completed';
        $order->is_complete = true;
        $order->save();
        return response()->json(['message'=>'Marked completed','order'=>$order],200);
    }
}
