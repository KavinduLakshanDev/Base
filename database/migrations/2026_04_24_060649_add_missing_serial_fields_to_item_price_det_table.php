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
            if (!Schema::hasColumn('item_price_det', 'serial_number')) {
                $table->string('serial_number', 100)->nullable()->after('ItmKy');
            }
            
            // Drop redundant columns if they exist
            $columnsToDrop = [];
            if (Schema::hasColumn('item_price_det', 'ItemCode')) {
                $columnsToDrop[] = 'ItemCode';
            }
            if (Schema::hasColumn('item_price_det', 'BarCode')) {
                $columnsToDrop[] = 'BarCode';
            }
            if (Schema::hasColumn('item_price_det', 'brand')) {
                $columnsToDrop[] = 'brand';
            }
            if (Schema::hasColumn('item_price_det', 'model')) {
                $columnsToDrop[] = 'model';
            }
            
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('item_price_det', function (Blueprint $table) {
            $table->dropColumn(['serial_number']);
        });
    }
};
