<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The legacy expenses system has been replaced by the petty cash system
     * (petty_cash_categories + petty_cash_transactions). Drop the old tables
     * so they are also removed on fresh installs.
     */
    public function up(): void
    {
        Schema::dropIfExists('expense_transactions');
        Schema::dropIfExists('expenses');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No automatic restore of the dropped legacy tables.
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Schema::create('expenses', function ($table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('section_code', 50)->nullable();
            $table->string('company_code', 50)->nullable();
            $table->timestamps();
            $table->index('company_code');
            $table->index('section_code');
        });
        Schema::create('expense_transactions', function ($table) {
            $table->id();
            $table->unsignedBigInteger('expense_id');
            $table->decimal('amount', 15, 2)->default(0);
            $table->date('transaction_date');
            $table->text('notes')->nullable();
            $table->string('section_code', 50)->nullable();
            $table->string('company_code', 50)->nullable();
            $table->unsignedBigInteger('created_by_id')->nullable();
            $table->timestamps();
            $table->index('company_code');
            $table->index('section_code');
            $table->index('transaction_date');
        });
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }
};
