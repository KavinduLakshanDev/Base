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
        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->unsignedBigInteger('section_id')->nullable()->change();
            $table->unsignedBigInteger('vehicle_id')->nullable()->after('section_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->dropColumn('vehicle_id');
            $table->unsignedBigInteger('section_id')->nullable(false)->change();
        });
    }
};
