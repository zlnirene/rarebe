<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CourierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('couriers')->insert([
            [
                'name' => 'JNE',
                'price' => 15000,
                'estimated_time' => '2-4 Hari',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'J&T Express',
                'price' => 14000,
                'estimated_time' => '2-3 Hari',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'SiCepat Ekspres',
                'price' => 10000,
                'estimated_time' => '1-3 Hari',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'POS Indonesia',
                'price' => 12000,
                'estimated_time' => '3-5 Hari',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'TIKI',
                'price' => 14000,
                'estimated_time' => '2-4 Hari',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
