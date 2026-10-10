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
        Schema::table('cash_reconciliations', function (Blueprint $table) {
            $table->decimal('bank_transfer_payments', 15, 2)->default(0)->after('expenses');
            $table->decimal('cheque_payments', 15, 2)->default(0)->after('bank_transfer_payments');
            $table->decimal('card_payments', 15, 2)->default(0)->after('cheque_payments');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_reconciliations', function (Blueprint $table) {
            $table->dropColumn(['bank_transfer_payments', 'cheque_payments', 'card_payments']);
        });
    }
};
