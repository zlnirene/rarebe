<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\Product;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Category mapping:
        // 1 = Body, 2 = Face, 3 = Fragrance, 4 = Hair
        $products = [
            // Body (1)
            ['category_id' => 1, 'name' => 'Shea Body Butter', 'description' => 'Rich body butter that deeply moisturizes and softens very dry skin.', 'price' => 270000, 'modal_price' => 200000, 'stock' => 100, 'is_best_seller' => true],
            ['category_id' => 1, 'name' => 'Moringa Body Lotion', 'description' => 'Lightweight lotion that hydrates skin and leaves a refreshing floral scent of moringa.', 'price' => 180000, 'modal_price' => 130000, 'stock' => 120],
            ['category_id' => 1, 'name' => 'British Rose Shower Gel', 'description' => 'Refreshing shower gel infused with real rose essence.', 'price' => 150000, 'modal_price' => 110000, 'stock' => 140],
            ['category_id' => 1, 'name' => 'Almond Milk Body Yogurt', 'description' => 'Fast-absorbing gel-cream that provides 48-hour moisture.', 'price' => 230000, 'modal_price' => 170000, 'stock' => 110, 'is_new' => true],

            // Face (2)
            ['category_id' => 2, 'name' => 'Tea Tree Facial Wash', 'description' => 'Purifying cleanser that removes impurities and helps reduce blemishes.', 'price' => 170000, 'modal_price' => 120000, 'stock' => 90],
            ['category_id' => 2, 'name' => 'Vitamin E Moisture Cream', 'description' => 'Hydrating face cream enriched with vitamin E for soft, smooth skin.', 'price' => 210000, 'modal_price' => 150000, 'stock' => 100],
            ['category_id' => 2, 'name' => 'Aloe Calming Toner', 'description' => 'Gentle alcohol-free toner that soothes and refreshes sensitive skin.', 'price' => 160000, 'modal_price' => 120000, 'stock' => 80],
            ['category_id' => 2, 'name' => 'Drops of Youth Concentrate', 'description' => 'Light serum that helps skin look smoother and fresher.', 'price' => 420000, 'modal_price' => 310000, 'stock' => 70, 'is_best_seller' => true],

            // Fragrance (3)
            ['category_id' => 3, 'name' => 'White Musk Eau de Toilette', 'description' => 'Iconic floral musk fragrance that is soft, sensual, and cruelty-free.', 'price' => 390000, 'modal_price' => 280000, 'stock' => 60],
            ['category_id' => 3, 'name' => 'Black Musk Body Mist', 'description' => 'Sweet, sensual body mist with notes of musk, vanilla, and black sugar.', 'price' => 230000, 'modal_price' => 170000, 'stock' => 100],
            ['category_id' => 3, 'name' => 'Japanese Cherry Blossom Eau de Toilette', 'description' => 'Delicate floral scent inspired by blooming cherry blossoms.', 'price' => 370000, 'modal_price' => 260000, 'stock' => 80],
            ['category_id' => 3, 'name' => 'Pink Grapefruit Body Mist', 'description' => 'Fruity mist for a refreshing and energizing scent all day.', 'price' => 190000, 'modal_price' => 140000, 'stock' => 120, 'is_new' => true],

            // Hair (4)
            ['category_id' => 4, 'name' => 'Ginger Anti-Dandruff Shampoo', 'description' => 'Refreshing shampoo that helps reduce flakes and soothes scalp.', 'price' => 220000, 'modal_price' => 160000, 'stock' => 90],
            ['category_id' => 4, 'name' => 'Banana Truly Nourishing Conditioner', 'description' => 'Creamy conditioner enriched with banana puree for silky hair.', 'price' => 210000, 'modal_price' => 150000, 'stock' => 100],
            ['category_id' => 4, 'name' => 'Tea Tree Purifying & Balancing Hair Mask', 'description' => 'Purifies scalp and refreshes hair without weighing it down.', 'price' => 310000, 'modal_price' => 240000, 'stock' => 60],
            ['category_id' => 4, 'name' => 'Moringa Shine & Protection Hair Mist', 'description' => 'Lightweight mist that adds shine and protects hair from pollution.', 'price' => 270000, 'modal_price' => 200000, 'stock' => 80],
        ];

        foreach ($products as $p) {
            Product::updateOrCreate(
                ['name' => $p['name']],
                [
                    'slug' => Str::slug($p['name']),
                    'category_id' => $p['category_id'],
                    'description' => $p['description'],
                    'long_description' => $p['description'],
                    'price' => $p['price'],
                    'modal_price' => $p['modal_price'],
                    'stock' => $p['stock'],
                    'is_new' => $p['is_new'] ?? false,
                    'is_best_seller' => $p['is_best_seller'] ?? false,
                    'sku' => 'SKU-' . strtoupper(Str::random(8)),
                    'bpom_number' => null,
                    'tips' => null,
                    'main_image' => null,
                    'is_active' => true,
                ]
            );
        }
    }
}
