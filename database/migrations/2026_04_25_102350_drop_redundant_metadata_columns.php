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
        Schema::table('purchase_det', function (Blueprint $table) {
            $table->dropColumn(['brand', 'model', 'warranty', 'barcode', 'stock_location_type', 'VATItem', 'item_name']);
        });

        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->dropColumn(['brand', 'model', 'warranty']);
        });

        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropColumn(['item_name', 'brand', 'model', 'warranty']);
        });

        Schema::table('sales_transaction_items', function (Blueprint $table) {
            $table->dropColumn(['item_name', 'barcode', 'brand', 'model', 'warranty']);
        });

        Schema::table('customer_return_items', function (Blueprint $table) {
            $table->dropColumn(['item_name', 'brand', 'model', 'warranty']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_det', function (Blueprint $table) {
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('warranty')->nullable();
            $table->string('barcode')->nullable();
            $table->string('stock_location_type')->nullable();
            $table->boolean('VATItem')->default(false);
            $table->string('item_name')->nullable();
        });

        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('warranty')->nullable();
        });

        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->string('item_name')->nullable();
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('warranty')->nullable();
        });

        Schema::table('sales_transaction_items', function (Blueprint $table) {
            $table->string('item_name')->nullable();
            $table->string('barcode')->nullable();
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('warranty')->nullable();
        });

        Schema::table('customer_return_items', function (Blueprint $table) {
            $table->string('item_name')->nullable();
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('warranty')->nullable();
        });
    }
};
