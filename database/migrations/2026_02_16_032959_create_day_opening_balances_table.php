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
        Schema::create('day_opening_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('balance_date');
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->string('currency', 3)->default('LKR');
            $table->enum('status', ['active', 'closed', 'cancelled'])->default('active');
            $table->string('company_code');
            $table->string('section_code');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->unique(['user_id', 'balance_date', 'company_code', 'section_code'], 'day_opening_balances_unique');
            $table->index(['balance_date', 'status']);
            $table->index(['company_code', 'section_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('day_opening_balances');
    }
};
