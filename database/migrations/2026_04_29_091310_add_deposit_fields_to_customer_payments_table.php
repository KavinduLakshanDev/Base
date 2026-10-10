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
        Schema::table('customer_payments', function (Blueprint $table) {
            $table->boolean('is_deposited')->default(false)->after('status');
            $table->timestamp('deposited_at')->nullable()->after('is_deposited');
            $table->unsignedBigInteger('deposit_bank_id')->nullable()->after('deposited_at');

            $table->foreign('deposit_bank_id')->references('id')->on('bank_accounts')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_payments', function (Blueprint $table) {
            $table->dropForeign(['deposit_bank_id']);
            $table->dropColumn(['is_deposited', 'deposited_at', 'deposit_bank_id']);
        });
    }
};
