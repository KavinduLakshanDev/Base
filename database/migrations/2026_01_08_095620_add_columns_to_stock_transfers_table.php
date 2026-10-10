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
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->string('batch_no', 255)->nullable()->after('company_code');
            $table->string('brand', 255)->nullable()->after('batch_no');
            $table->string('model', 255)->nullable()->after('brand');
            $table->string('serial_number', 255)->nullable()->after('model');
            $table->enum('warranty', ['3months', '6months', '12 months', '1 year', '2 years', '5 years'])->nullable()->after('serial_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropColumn(['batch_no', 'brand', 'model', 'serial_number', 'warranty']);
        });
    }
};
