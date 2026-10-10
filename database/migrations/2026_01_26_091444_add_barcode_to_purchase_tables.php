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
        Schema::table('purchase', function (Blueprint $table) {
            $table->string('barcode', 100)->nullable()->after('batch_no');
        });

        Schema::table('purchase_det', function (Blueprint $table) {
            $table->string('barcode', 100)->nullable()->after('warranty');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase', function (Blueprint $table) {
            $table->dropColumn('barcode');
        });

        Schema::table('purchase_det', function (Blueprint $table) {
            $table->dropColumn('barcode');
        });
    }
};
