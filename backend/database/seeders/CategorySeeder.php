<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Body',
                'slug' => 'body care',
                'description' => 'Lotion, body butters',
                'image' => '',
                'is_active' => true,
            ],
            [
                'name' => 'Face',
                'slug' => 'face skin care',
                'description' => 'Facial cleanser, moisturizer, toner',
                'image' => '',
                'is_active' => true,
            ],
            [
                'name' => 'Fragrance',
                'slug' => 'fragrance',
                'description' => 'Eau de perfume, body mist',
                'image' => '',
                'is_active' => true,
            ],
            [
                'name' => 'Hair',
                'slug' => 'hair care',
                'description' => 'shampoo, conditioner, hair mist',
                'image' => '',
                'is_active' => true,
            ],
        ];

        foreach ($categories as $category) {
            $slug = Str::slug($category['slug'] ?? $category['name']);

            DB::table('categories')->updateOrInsert(
                ['slug' => $slug], // unique key
                [
                    'name' => $category['name'],
                    'description' => $category['description'] ?? null,
                    'image' => $category['image'] ?? null,
                    'is_active' => $category['is_active'] ?? true,
                    // timestamps
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
