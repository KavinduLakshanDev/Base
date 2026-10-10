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
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('from_section_code');
            $table->string('to_section_code');
            $table->unsignedBigInteger('item_id');
            $table->decimal('quantity', 10, 2);
            $table->decimal('cost_price', 10, 2);
            $table->date('transfer_date');
            $table->text('notes')->nullable();
            $table->string('company_code');
            $table->timestamps();

            // Indexes
            $table->index(['from_section_code', 'to_section_code']);
            $table->index('item_id');
            $table->index('transfer_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_transfers');
    }
};