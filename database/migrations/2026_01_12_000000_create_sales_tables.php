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
        Schema::create('sales_transactions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('invoice_no')->unique();
            $table->date('transaction_date');
            $table->string('customer_code')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('price_type')->nullable(); // Retail, Wholesale, Extra
            $table->string('company_code')->nullable();
            $table->string('section_code')->nullable();
            $table->unsignedBigInteger('cashier_id')->nullable();
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->longText('payment_details')->nullable();
            $table->enum('status', ['completed', 'cancelled', 'refunded', 'pending'])->default('completed');
            $table->text('notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['transaction_date', 'invoice_no']);
        });

        Schema::create('sales_transaction_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('sales_transaction_id');
            $table->string('item_code');
            $table->string('item_name');
            $table->string('item_name_english', 200)->nullable();
            $table->string('barcode', 100)->nullable();
            $table->string('category', 100)->nullable();
            $table->string('unit', 50)->nullable();
            $table->unsignedBigInteger('product_id')->nullable();
            $table->string('company_code')->nullable();
            $table->string('section_code')->nullable();
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('original_price', 12, 2)->default(0);
            $table->decimal('our_price', 10, 2)->default(0);
            $table->decimal('cost_price', 12, 2)->default(0);
            $table->decimal('quantity', 10, 2)->default(0);
            $table->decimal('free_quantity', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->string('discount_type', 50)->nullable();
            $table->string('promotion_code', 50)->nullable();
            $table->integer('retail_tier')->nullable();
            $table->decimal('retail_tier_qty', 10, 3)->nullable();
            $table->decimal('retail_tier_discount', 5, 2)->nullable();
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('tax_percentage', 5, 2)->default(0);
            $table->tinyInteger('is_tax_inclusive')->default(1);
            $table->decimal('line_total', 10, 2)->default(0);
            $table->decimal('line_subtotal', 12, 2)->default(0);
            $table->tinyInteger('is_free_item')->default(0);
            $table->tinyInteger('is_return')->default(0);
            $table->unsignedBigInteger('original_item_id')->nullable();
            $table->integer('line_number')->nullable();
            $table->text('notes')->nullable();
            $table->string('price_type')->nullable();
            $table->longText('additional_data')->nullable();
            $table->timestamps();

            $table->foreign('sales_transaction_id')->references('id')->on('sales_transactions')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_transaction_items');
        Schema::dropIfExists('sales_transactions');
    }
};
