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
            $table->string('payment_method')->default('cash')->after('amount'); // cash, cheque, online
            $table->string('cheque_number')->nullable()->after('payment_method');
            $table->date('cheque_date')->nullable()->after('cheque_number');
            $table->string('reference_number')->nullable()->after('cheque_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_vouchers', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'cheque_number', 'cheque_date', 'reference_number']);
        });
    }
};
