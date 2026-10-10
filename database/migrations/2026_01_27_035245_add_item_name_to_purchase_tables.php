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
        // Add item_name to purchase table (for summary/representative item name)
        Schema::table('purchase', function (Blueprint $table) {
            $table->string('item_name', 255)->nullable()->after('barcode')->comment('Representative item name for the purchase');
        });

        // Add item_name to purchase_det table (for each line item)
        Schema::table('purchase_det', function (Blueprint $table) {
            $table->string('item_name', 255)->nullable()->after('barcode')->comment('Item name for this purchase detail line');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove item_name from purchase table
        Schema::table('purchase', function (Blueprint $table) {
            $table->dropColumn('item_name');
        });

        // Remove item_name from purchase_det table
        Schema::table('purchase_det', function (Blueprint $table) {
            $table->dropColumn('item_name');
        });
    }
};
