<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku')->nullable()->unique();
            $table->string('bpom_number')->nullable();
            $table->text('description')->nullable();
            $table->text('long_description')->nullable();
            $table->text('tips')->nullable();
            $table->decimal('modal_price', 12, 2)->default(0);
            $table->decimal('price', 12, 2)->default(0);
            $table->integer('stock')->default(0);
            $table->string('main_image')->nullable();
            $table->boolean('is_new')->default(false);
            $table->boolean('is_best_seller')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
