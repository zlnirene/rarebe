<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'address_id',
        'courier_id',
        'order_code',
        'total_price',
        'status',
        'is_complete',
        'cancel', // added
    ];

    protected $casts = [
        'total_price' => 'float',
        'is_complete' => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    public function address()
    {
        return $this->belongsTo(\App\Models\Address::class);
    }
}
