<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // public function up(): void
    // {
    //     Schema::table('itemmaster', function (Blueprint $table) {
    //         if (Schema::hasColumn('itemmaster', 'WholePrice')) {
    //             $table->dropColumn('WholePrice');
    //         }
    //         if (Schema::hasColumn('itemmaster', 'wholesale_min_qty')) {
    //             $table->dropColumn('wholesale_min_qty');
    //         }
    //     });

    //     Schema::table('item_price_det', function (Blueprint $table) {
    //         if (Schema::hasColumn('item_price_det', 'WholePrice')) {
    //             $table->dropColumn('WholePrice');
    //         }
    //     });

    //     Schema::table('stock_adjustment_items', function (Blueprint $table) {
    //         if (Schema::hasColumn('stock_adjustment_items', 'wholesale_price')) {
    //             $table->dropColumn('wholesale_price');
    //         }
    //     });
    // }

    /**
     * Reverse the migrations.
     */
    // public function down(): void
    // {
    //     Schema::table('itemmaster', function (Blueprint $table) {
    //         $table->decimal('WholePrice', 18, 4)->nullable();
    //         $table->integer('wholesale_min_qty')->nullable();
    //     });

    //     Schema::table('item_price_det', function (Blueprint $table) {
    //         $table->decimal('WholePrice', 18, 4)->nullable();
    //     });

    //     Schema::table('stock_adjustment_items', function (Blueprint $table) {
    //         $table->decimal('wholesale_price', 15, 4)->default(0);
    //     });
    // }
};
