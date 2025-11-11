<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    use HasFactory;

    protected $table = 'product_variant';

    protected $fillable = [
        'product_id',
        'variant_name',
        'sku',
        'stock',
        'variant_image',
        'is_active',
    ];

    protected $appends = ['variant_image_url']; // include in JSON

    /**
     * Relasi ke model Product
     * Setiap varian dimiliki oleh satu produk.
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function images()
    {
        return $this->hasMany(ProductVariantImage::class, 'product_variant_id');
    }

    /**
     * Accessor agar bisa ambil URL penuh gambar varian.
     */
    public function getVariantImageUrlAttribute()
    {
        return $this->variant_image
            ? asset('images/' . ltrim(preg_replace('#^/?images/#', '', $this->variant_image), '/'))
            : null;
    }

    /**
     * Auto generate SKU jika belum ada.
     */
    protected static function boot()
    {
        parent::boot();

            static::creating(function ($variant) {
                if (empty($variant->sku)) {
                    $prefix = 'VAR-' . strtoupper(substr($variant->variant_name ?? 'VAR', 0, 3));
                    $variant->sku = $prefix . '-' . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
                }
            });
        }
    }
