<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory;

    const STATUS = [
        0 => 'Tidak Aktif',
        1 => 'Aktif',
    ];

    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'description',
        'price',
        'modal_price',
        'is_new',
        'is_best_seller',
        'stock',
        'sku',
        'bpom_number',
        'long_description',
        'tips',
        'main_image',
        'is_active',
    ];

    protected $casts = [
        'is_new' => 'boolean',
        'is_best_seller' => 'boolean',
        'modal_price' => 'float',
        'price' => 'float',
    ];

    protected $appends = ['main_image_url'];

    public function getMainImageUrlAttribute()
    {
        if ($this->main_image) {
            return asset('images/' . ltrim(preg_replace('#^/?images/#', '', $this->main_image), '/'));
        }
        // fallback primary image
        if ($this->relationLoaded('images')) {
            $primary = $this->images->firstWhere('is_primary', true);
            if ($primary) return $primary->image_url;
        } else {
            $primary = $this->images()->where('is_primary',true)->first();
            if ($primary) return $primary->image_url;
        }
        return null;
    }

    public function getActiveAttribute()
    {
        return self::STATUS[$this->is_active] ?? '-';
    }
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($product) {
            $product->slug = Str::slug($product->name);
        });
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class, 'product_id');
    }

    public function mainImage()
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    public function reviews()
    {
        return $this->hasMany(\App\Models\Review::class, 'product_id');
    }

    public function getAverageRatingAttribute()
    {
        if (!$this->relationLoaded('reviews')) return null;
        $count = $this->reviews->count();
        return $count ? round($this->reviews->avg('rating'), 2) : null;
    }
}
