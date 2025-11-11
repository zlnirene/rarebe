<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('address_id')->constrained('addresses')->cascadeOnDelete();
            $table->foreignId('courier_id')->constrained('couriers')->cascadeOnDelete();
            $table->string('order_code')->unique();
            $table->decimal('total_price', 12, 2);
            $table->enum('status', ['pending', 'paid', 'shipped', 'to receive', 'completed', 'cancelled'])->default('pending');
            $table->boolean('is_complete')->default(false);
            $table->text('cancel')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
