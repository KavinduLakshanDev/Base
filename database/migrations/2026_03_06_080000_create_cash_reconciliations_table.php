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
        Schema::create('cash_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->string('company_code', 10);
            $table->string('section_code', 10);
            $table->unsignedBigInteger('user_id');
            $table->string('username', 50);
            $table->date('reconciliation_date');
            
            // Cash denominations
            $table->integer('notes_5000')->default(0);
            $table->integer('notes_2000')->default(0);
            $table->integer('notes_1000')->default(0);
            $table->integer('notes_500')->default(0);
            $table->integer('notes_100')->default(0);
            $table->integer('notes_50')->default(0);
            $table->integer('notes_20')->default(0);
            $table->decimal('coins', 15, 2)->default(0);
            
            // Calculated amounts
            $table->decimal('actual_cash', 15, 2)->default(0);
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('cash_sales', 15, 2)->default(0);
            $table->decimal('credit_payments', 15, 2)->default(0);
            $table->decimal('expenses', 15, 2)->default(0);
            $table->decimal('expected_closing', 15, 2)->default(0);
            $table->decimal('variance', 15, 2)->default(0);
            
            // Notes and status
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'balanced', 'flagged'])->default('pending');
            
            $table->timestamps();
            
            // Indexes with custom short names
            $table->index(['company_code', 'section_code', 'reconciliation_date'], 'cr_company_section_date_idx');
            $table->index(['user_id', 'reconciliation_date'], 'cr_user_date_idx');
            $table->unique(['company_code', 'section_code', 'user_id', 'reconciliation_date'], 'cr_unique_reconciliation');
            
            // Foreign key
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_reconciliations');
    }
};
