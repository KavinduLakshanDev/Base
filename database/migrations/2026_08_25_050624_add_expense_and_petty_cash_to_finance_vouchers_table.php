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
            $table->foreignId('expense_account_id')->nullable()->constrained('expense_accounts');
            $table->foreignId('petty_cash_category_id')->nullable()->constrained('petty_cash_categories');
            $table->foreignId('to_expense_account_id')->nullable()->constrained('expense_accounts');
            $table->foreignId('to_petty_cash_category_id')->nullable()->constrained('petty_cash_categories');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_vouchers', function (Blueprint $table) {
            $table->dropForeign(['expense_account_id']);
            $table->dropForeign(['petty_cash_category_id']);
            $table->dropForeign(['to_expense_account_id']);
            $table->dropForeign(['to_petty_cash_category_id']);
            $table->dropColumn([
                'expense_account_id',
                'petty_cash_category_id',
                'to_expense_account_id',
                'to_petty_cash_category_id',
            ]);
        });
    }
};
