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
        Schema::create('printer_wastages', function (Blueprint $table) {
            $table->id();
            $table->string('purchase_det_key', 50);
            $table->decimal('quantity', 10, 2)->default(1);
            $table->string('reason');
            $table->date('wastage_date');
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->unsignedBigInteger('recorded_by');
            $table->unsignedBigInteger('section_id');
            $table->timestamps();

            // Index for purchase_det_key (foreign key constraint removed due to type incompatibility)
            $table->index('purchase_det_key');
            $table->index('recorded_by');
            $table->index('section_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printer_wastages');
    }
};
