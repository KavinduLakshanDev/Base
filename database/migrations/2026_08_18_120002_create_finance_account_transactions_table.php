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
        Schema::create('finance_account_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finance_account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->dateTime('date');
            $table->string('source_type')->nullable(); // model class
            $table->unsignedBigInteger('source_id')->nullable(); // model id
            $table->string('description')->nullable();
            $table->string('method')->default('cash');
            $table->string('type'); // 'debit' (in) or 'credit' (out)
            $table->decimal('amount', 15, 2);
            $table->string('reference')->nullable();
            $table->timestamps();
            
            $table->index(['source_type', 'source_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finance_account_transactions');
    }
};
