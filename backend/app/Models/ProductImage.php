<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductImage extends Model
{
    use HasFactory;

    protected $table = 'product_images';

    protected $fillable = [
        'product_id',
        'image_url',
        'is_primary',
        'sort_order',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'sort_order' => 'integer',
    ];

    // relation
    public function product()
    {
        return $this->belongsTo(\App\Models\Product::class);
    }

    // ensure frontend can read image_url (absolute)
    public function getImageUrlAttribute($value)
    {
        if (empty($value)) return null;
        return asset('images/' . ltrim(preg_replace('#^/?images/#', '', $value), '/'));
    }
}
