<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Address extends Model
{
    use HasFactory;

    protected $table = 'addresses';

    protected $fillable = [
        'user_id',
        'nama_tempat',
        'no_telp',
        'alamat',
        'kecamatan',
        'kabupaten',
        'provinsi',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    public function orders()
    {
        return $this->hasMany(\App\Models\Order::class, 'address_id');
    }
}
