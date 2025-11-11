<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'image',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = ['image_url'];

    public function products()
    {
        return $this->hasMany(\App\Models\Product::class, 'category_id');
    }

    // Normalisasi URL gambar agar frontend dapat gunakan category.image_url
    public function getImageUrlAttribute()
    {
        if (empty($this->image)) return null;
        return asset('images/' . ltrim(preg_replace('#^/?images/#', '', $this->image), '/'));
    }
}
