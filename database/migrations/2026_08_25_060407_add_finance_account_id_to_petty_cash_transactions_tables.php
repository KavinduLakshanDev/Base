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
        Schema::table('petty_cash_transactions', function (Blueprint $table) {
            $table->foreignId('finance_account_id')->nullable()->constrained('finance_accounts');
        });

        Schema::table('delivery_petty_cash_transactions', function (Blueprint $table) {
            $table->foreignId('finance_account_id')->nullable()->constrained('finance_accounts');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('petty_cash_transactions_tables', function (Blueprint $table) {
            //
        });
    }
};
