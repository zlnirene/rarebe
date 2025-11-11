<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariantImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_variant_id',
        'image_path',
    ];

    protected $appends = ['image_url'];

    /**
     * Relasi ke model ProductVariant
     */
    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function getImageUrlAttribute()
    {
        // Normalize to public/images base folder
        return $this->image_path
            ? asset('images/' . ltrim(preg_replace('#^/?images/#', '', $this->image_path), '/'))
            : null;
    }
}
