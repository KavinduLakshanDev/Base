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
        Schema::table('item_price_det', function (Blueprint $table) {
            if (Schema::hasColumn('item_price_det', 'Price')) {
                $table->dropColumn('Price');
            }
            if (Schema::hasColumn('item_price_det', 'PrevPrice')) {
                $table->dropColumn('PrevPrice');
            }
            if (Schema::hasColumn('item_price_det', 'DiscountQty')) {
                $table->dropColumn('DiscountQty');
            }
            if (Schema::hasColumn('item_price_det', 'QuntityDiscount')) {
                $table->dropColumn('QuntityDiscount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('item_price_det', function (Blueprint $table) {
            $table->decimal('Price', 15, 4)->default(0);
            $table->decimal('PrevPrice', 15, 4)->default(0);
            $table->decimal('DiscountQty', 15, 4)->default(0);
            $table->decimal('QuntityDiscount', 15, 4)->default(0);
        });
    }
};
