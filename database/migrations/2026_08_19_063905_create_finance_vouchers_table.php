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
        Schema::create('finance_vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('finance_voucher_no')->unique();
            $table->date('date');
            $table->string('type', 20); // deposit or withdraw
            
            $table->foreignId('finance_account_id')->nullable()->constrained('finance_accounts');
            $table->foreignId('bank_account_id')->nullable()->constrained('bank_accounts');
            
            $table->foreignId('to_finance_account_id')->nullable()->constrained('finance_accounts');
            $table->foreignId('to_bank_account_id')->nullable()->constrained('bank_accounts');

            $table->string('payer_account');
            $table->text('description')->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('slip_path')->nullable();
            
            $table->string('section_code', 50)->nullable();
            $table->string('company_code', 50)->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users');
            $table->timestamps();
            
            $table->index('date');
            $table->index('type');
            $table->index('company_code');
            $table->index('section_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finance_vouchers');
    }
};
