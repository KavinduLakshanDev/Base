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
        Schema::create('petty_cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_no')->unique()->nullable();
            $table->string('type', 20)->default('usage');
            $table->foreignId('category_id')->nullable()->constrained('petty_cash_categories');
            $table->decimal('amount', 15, 2)->default(0);
            $table->date('transaction_date');
            $table->text('notes')->nullable();
            $table->string('slip_path')->nullable();

            $table->string('section_code', 50)->nullable();
            $table->string('company_code', 50)->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users');

            $table->timestamps();

            $table->index('company_code');
            $table->index('section_code');
            $table->index('transaction_date');
            $table->index('category_id');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('petty_cash_transactions');
    }
};
