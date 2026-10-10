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
        Schema::create('customer_return_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_return_id');
            
            // Item details
            $table->string('item_code', 50);
            $table->integer('item_ky')->nullable();
            $table->string('item_name');
            
            // Quantity and pricing
            $table->decimal('quantity', 10, 2);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2);
            
            // Batch and serial tracking
            $table->string('batch_no')->nullable();
            $table->string('serial_number')->nullable();
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('warranty')->nullable();
            
            // Item type (regular item or printer)
            $table->enum('item_type', ['item', 'printer'])->default('item');
            
            // Damage assessment
            $table->enum('condition', ['good', 'damaged', 'defective'])->default('good');
            $table->text('damage_notes')->nullable();
            $table->boolean('add_to_stock')->default(true); // Whether to add back to stock
            
            // Stock location (where the item will be returned)
            $table->string('stock_location_type', 20)->nullable(); // 'section', 'shop', 'vehicle'
            $table->string('stock_location_code', 50)->nullable();
            
            // Original sale item reference
            $table->unsignedBigInteger('original_sale_item_id')->nullable();
            
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('customer_return_id')->references('id')->on('customer_returns')->onDelete('cascade');
            $table->foreign('original_sale_item_id')->references('id')->on('sales_transaction_items')->onDelete('set null');
            
            // Indexes
            $table->index('item_code');
            $table->index('serial_number');
            $table->index('batch_no');
            $table->index('condition');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_return_items');
    }
};
