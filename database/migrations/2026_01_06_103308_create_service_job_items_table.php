<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_job_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('service_job_id');
            $table->string('item_type')->comment('part, service_charge, other');
            $table->string('ItmKy')->nullable()->comment('Item ID from itemmaster');
            $table->string('item_code')->nullable();
            $table->string('item_name');
            $table->string('barcode')->nullable();
            $table->decimal('quantity', 15, 4)->default(1);
            $table->decimal('unit_price', 18, 2)->default(0);
            $table->decimal('total_price', 18, 2)->default(0);
            $table->text('description')->nullable();
            $table->string('company_code', 255)->nullable();
            $table->string('section_code', 255)->nullable();
            $table->timestamps();
            
            // Foreign key
            $table->foreign('service_job_id')
                  ->references('id')
                  ->on('service_jobs')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_job_items');
    }
};