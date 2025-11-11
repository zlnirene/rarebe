<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'is_new')) {
                $table->boolean('is_new')->default(false)->after('price');
            }
            if (!Schema::hasColumn('products', 'is_best_seller')) {
                $table->boolean('is_best_seller')->default(false)->after('is_new');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'is_best_seller')) {
                $table->dropColumn('is_best_seller');
            }
            if (Schema::hasColumn('products', 'is_new')) {
                $table->dropColumn('is_new');
            }
        });
    }
};
