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
            $table->dropColumn(['promotion_code', 'item_name_english']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_transaction_items', function (Blueprint $table) {
            $table->string('promotion_code', 50)->nullable()->after('discount_type');
            $table->string('item_name_english', 200)->nullable()->after('item_name');
        });
    }
};
