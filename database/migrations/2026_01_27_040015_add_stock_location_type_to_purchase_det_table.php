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
            $table->enum('stock_location_type', ['main_stock', 'printing_section'])->nullable()->after('barcode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_det', function (Blueprint $table) {
            $table->dropColumn('stock_location_type');
        });
    }
};
