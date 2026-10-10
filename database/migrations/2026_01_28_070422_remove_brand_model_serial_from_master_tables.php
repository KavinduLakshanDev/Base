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
        // Remove brand, model, serial_number from itemmaster table
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropColumn(['brand', 'model', 'serial_number']);
        });

        // Remove brand, model, serial_number from item_price_det table
        Schema::table('item_price_det', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('item_price_det', 'brand')) {
                $columnsToDrop[] = 'brand';
            }
            if (Schema::hasColumn('item_price_det', 'model')) {
                $columnsToDrop[] = 'model';
            }
            if (Schema::hasColumn('item_price_det', 'serial_number')) {
                $columnsToDrop[] = 'serial_number';
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
        // Add back brand, model, serial_number to itemmaster table
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->string('brand', 100)->nullable()->after('batch_no');
            $table->string('model', 100)->nullable()->after('brand');
            $table->string('serial_number', 100)->nullable()->after('model');
        });

        // Add back brand, model, serial_number to item_price_det table
        Schema::table('item_price_det', function (Blueprint $table) {
            if (!Schema::hasColumn('item_price_det', 'brand')) {
                $table->string('brand', 100)->nullable()->after('batch_no');
            }
            if (!Schema::hasColumn('item_price_det', 'model')) {
                $table->string('model', 100)->nullable()->after('brand');
            }
            if (!Schema::hasColumn('item_price_det', 'serial_number')) {
                $table->string('serial_number', 100)->nullable()->after('model');
            }
        });
    }
};
