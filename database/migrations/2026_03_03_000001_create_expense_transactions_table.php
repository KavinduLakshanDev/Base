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
        Schema::create('expense_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_id')->constrained('expenses');
            $table->decimal('amount', 15, 2)->default(0);
            $table->date('transaction_date');
            $table->text('notes')->nullable();

            $table->string('section_code', 10)->nullable();
            $table->string('company_code', 10)->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users');

            $table->timestamps();

            $table->index('company_code');
            $table->index('section_code');
            $table->index('transaction_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_transactions');
    }
};
