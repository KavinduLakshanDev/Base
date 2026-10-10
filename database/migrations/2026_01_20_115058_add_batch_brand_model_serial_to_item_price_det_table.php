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

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
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
};
