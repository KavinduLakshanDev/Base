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
        Schema::create('customer_payments', function (Blueprint $table) {
            $table->id();
            $table->integer('customer_id')->unsigned();
            $table->decimal('amount', 15, 2);
            $table->date('date');
            $table->string('method'); // Cash, Cheque, Card, Credit, Bank Transfer
            $table->string('cheque_no')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('card_last_4')->nullable();
            $table->string('card_auth_code')->nullable();
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('completed');
            $table->timestamps();

            $table->foreign('customer_id')->references('AdrKy')->on('address')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_payments');
    }
};
