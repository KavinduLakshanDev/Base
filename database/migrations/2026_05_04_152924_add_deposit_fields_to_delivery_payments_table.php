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
        Schema::table('delivery_payments', function (Blueprint $table) {
            $table->boolean('is_deposited')->default(false)->after('status');
            $table->date('deposited_at')->nullable()->after('is_deposited');
            $table->foreignId('deposit_bank_id')->nullable()->constrained('bank_accounts')->after('deposited_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_payments', function (Blueprint $table) {
            $table->dropForeign(['deposit_bank_id']);
            $table->dropColumn(['is_deposited', 'deposited_at', 'deposit_bank_id']);
        });
    }
};
