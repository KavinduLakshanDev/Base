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
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('account_name');
            $table->string('account_number')->unique();
            $table->string('bank_name');
            $table->string('branch_name');
            $table->enum('account_type', ['savings', 'current', 'checking']);
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->string('currency', 3)->default('LKR');
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'inactive', 'closed'])->default('active');
            $table->string('company_code');
            $table->string('section_code');
            $table->unsignedBigInteger('created_by');
            $table->timestamps();

            $table->index(['company_code', 'section_code']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_accounts');
    }
};
