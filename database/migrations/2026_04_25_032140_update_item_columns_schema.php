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
        // Update itemmaster table
        Schema::table('itemmaster', function (Blueprint $table) {
            if (Schema::hasColumn('itemmaster', 'CCPrice')) {
                $table->dropColumn('CCPrice');
            }
            if (Schema::hasColumn('itemmaster', 'ScallItem')) {
                $table->dropColumn('ScallItem');
            }
            if (Schema::hasColumn('itemmaster', 'ExtraPrice') && !Schema::hasColumn('itemmaster', 'VehicleSalePrice')) {
                $table->renameColumn('ExtraPrice', 'VehicleSalePrice');
            }
        });

        // Update item_price_det table
        Schema::table('item_price_det', function (Blueprint $table) {
            if (Schema::hasColumn('item_price_det', 'CCPrice')) {
                $table->dropColumn('CCPrice');
            }
            if (Schema::hasColumn('item_price_det', 'ExtraPrice') && !Schema::hasColumn('item_price_det', 'VehicleSalePrice')) {
                $table->renameColumn('ExtraPrice', 'VehicleSalePrice');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->decimal('CCPrice', 15, 4)->default(0);
            $table->boolean('ScallItem')->default(false);
            $table->renameColumn('VehicleSalePrice', 'ExtraPrice');
        });

        Schema::table('item_price_det', function (Blueprint $table) {
            $table->decimal('CCPrice', 15, 4)->default(0);
            $table->renameColumn('VehicleSalePrice', 'ExtraPrice');
        });
    }
};
