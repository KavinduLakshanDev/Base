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
        Schema::create('supplier_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_type'); // 'item' or 'printer'
            $table->string('item_key')->nullable(); // For items from item_price_det
            $table->string('purchase_det_key')->nullable(); // For printers from purchase_det
            $table->string('supplier_code');
            $table->decimal('quantity', 10, 2);
            $table->decimal('return_value', 15, 2);
            $table->string('reason');
            $table->date('return_date');
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->unsignedBigInteger('recorded_by');
            $table->unsignedBigInteger('section_id');
            $table->string('company_code', 10);
            $table->string('section_code', 10);
            $table->string('serial_number')->nullable(); // For printers
            $table->string('batch_no')->nullable();
            $table->timestamps();

            $table->index('supplier_code');
            $table->index('return_type');
            $table->index('section_id');
            $table->index('recorded_by');
            $table->index('return_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_returns');
    }
};
