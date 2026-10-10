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
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropColumn(['DiscountQty', 'QuntityDiscount']);
        });

        // Keep DiscountQty and QuntityDiscount in item_price_det
        // Schema::table('item_price_det', function (Blueprint $table) {
        //     $table->dropColumn(['DiscountQty', 'QuntityDiscount']);
        // });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->integer('DiscountQty')->nullable();
            $table->decimal('QuntityDiscount', 15, 4)->default(0);
        });

        // Don't add back to item_price_det since we're keeping them
        // Schema::table('item_price_det', function (Blueprint $table) {
        //     $table->integer('DiscountQty')->nullable();
        //     $table->decimal('QuntityDiscount', 15, 4)->default(0);
        // });
    }
};
