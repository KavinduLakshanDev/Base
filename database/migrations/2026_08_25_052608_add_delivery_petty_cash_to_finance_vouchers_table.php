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
        Schema::table('finance_vouchers', function (Blueprint $table) {
            $table->foreignId('delivery_petty_cash_category_id')->nullable()->constrained('delivery_petty_cash_categories');
            $table->foreignId('to_delivery_petty_cash_category_id')->nullable()->constrained('delivery_petty_cash_categories');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_vouchers', function (Blueprint $table) {
            $table->dropForeign(['delivery_petty_cash_category_id']);
            $table->dropForeign(['to_delivery_petty_cash_category_id']);
            $table->dropColumn([
                'delivery_petty_cash_category_id',
                'to_delivery_petty_cash_category_id',
            ]);
        });
    }
};
