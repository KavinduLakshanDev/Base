<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_takings', function (Blueprint $table) {
            $table->id();
            $table->string('company_code')->nullable();
            $table->string('taking_number')->unique();
            $table->unsignedBigInteger('section_id');
            $table->date('taking_date');
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'completed', 'cancelled'])->default('draft');
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->timestamps();

            $table->index('company_code');
            $table->index('section_id');
            $table->foreign('recorded_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('stock_taking_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('taking_id')->constrained('stock_takings')->onDelete('cascade');
            $table->unsignedBigInteger('product_id');
            $table->string('batch_no')->nullable();
            $table->decimal('system_stock', 10, 2)->default(0);
            $table->decimal('actual_stock', 10, 2)->default(0);
            $table->decimal('variance', 10, 2)->default(0);
            $table->decimal('cost_price', 15, 4)->default(0);
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_taking_items');
        Schema::dropIfExists('stock_takings');
    }
};
