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
        Schema::create('stock_adjustment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adjustment_id')->constrained('stock_adjustments')->onDelete('cascade');
            $table->unsignedBigInteger('product_id');
            $table->enum('adjustment_type', ['addition', 'subtraction']);
            $table->decimal('quantity', 10, 2);
            $table->string('serial_number')->nullable();
            $table->string('batch_no')->nullable();
            $table->decimal('cost_price', 15, 4)->default(0);
            $table->decimal('sale_price', 15, 4)->default(0);
            $table->decimal('wholesale_price', 15, 4)->default(0);
            $table->decimal('extra_price', 15, 4)->default(0);
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_adjustment_items');
    }
};
