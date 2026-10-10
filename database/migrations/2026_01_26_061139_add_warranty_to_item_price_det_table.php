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
            if (!Schema::hasColumn('item_price_det', 'warranty')) {
                $table->string('warranty', 100)->nullable()->after('serial_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('item_price_det', function (Blueprint $table) {
            if (Schema::hasColumn('item_price_det', 'warranty')) {
                $table->dropColumn('warranty');
            }
        });
    }
};
