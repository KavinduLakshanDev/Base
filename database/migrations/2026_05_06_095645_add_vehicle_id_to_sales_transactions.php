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
        Schema::table('sales_transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('vehicle_id')->nullable()->after('cashier_id');
            $table->unsignedBigInteger('shop_id')->nullable()->after('vehicle_id');
            
            $table->foreign('vehicle_id')->references('id')->on('vehicles')->onDelete('set null');
            $table->foreign('shop_id')->references('id')->on('shops')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_transactions', function (Blueprint $table) {
            $table->dropForeign(['vehicle_id']);
            $table->dropForeign(['shop_id']);
            $table->dropColumn(['vehicle_id', 'shop_id']);
        });
    }
};
