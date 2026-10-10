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
        Schema::create('stock_in_hand', function (Blueprint $table) {
            $table->id('TableKy');
            $table->string('RefNo')->nullable();
            $table->string('company_code')->nullable();
            $table->string('section_code')->nullable();
            $table->date('OrdDate')->nullable();
            $table->unsignedBigInteger('ItemKy')->nullable();
            $table->decimal('Qty', 15, 2)->default(0);
            $table->decimal('FreeQty', 15, 2)->default(0);
            $table->string('TrnTyp', 10)->nullable(); // Transaction Type
            $table->unsignedBigInteger('OrdKy')->nullable(); // Order Key
            $table->unsignedBigInteger('StkKy')->nullable(); // Stock Key
            $table->unsignedBigInteger('OrdTypKy')->nullable(); // Order Type Key
            $table->unsignedBigInteger('CounterID')->nullable();
            $table->timestamps();

            $table->string('batch_no', 50)->nullable();
            $table->string('brand', 255)->nullable();
            $table->string('model', 255)->nullable();
            $table->string('serial_number', 255)->nullable();
            $table->enum('warranty', ['3months', '6months', '12 months','1 year', '2 years', '5 years'])->nullable();

            // Indexes for better performance
            $table->index(['company_code', 'section_code', 'ItemKy']);
            $table->index(['OrdDate']);
            $table->index(['TrnTyp']);
            $table->index(['OrdKy']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_in_hand');
    }
};