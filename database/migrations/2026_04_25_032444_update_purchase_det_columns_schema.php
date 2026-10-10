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
            if (Schema::hasColumn('purchase_det', 'CCPrice')) {
                $table->dropColumn('CCPrice');
            }
            if (Schema::hasColumn('purchase_det', 'ExtraPrice') && !Schema::hasColumn('purchase_det', 'VehicleSalePrice')) {
                $table->renameColumn('ExtraPrice', 'VehicleSalePrice');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_det', function (Blueprint $table) {
            $table->decimal('CCPrice', 15, 4)->default(0);
            $table->renameColumn('VehicleSalePrice', 'ExtraPrice');
        });
    }
};
