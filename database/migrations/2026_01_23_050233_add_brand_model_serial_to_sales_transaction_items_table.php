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
        Schema::table('sales_transaction_items', function (Blueprint $table) {
            $table->string('brand', 100)->nullable()->after('price_type');
            $table->string('model', 100)->nullable()->after('brand');
            $table->string('serial_number', 255)->nullable()->after('model');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_transaction_items', function (Blueprint $table) {
            $table->dropColumn(['brand', 'model', 'serial_number']);
        });
    }
};
