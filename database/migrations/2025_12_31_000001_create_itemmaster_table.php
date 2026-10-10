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
        Schema::create('itemmaster', function (Blueprint $table) {
            $table->string('ItmKy', 50);
            $table->string('batch_no', 50)->default('DEFAULT');
            $table->string('ItemCode', 50);
            $table->string('ItemName', 200)->nullable();
            $table->string('ItemName2', 200)->nullable();
            $table->string('PartNo', 100)->nullable();
            $table->string('ItmGrp', 50)->nullable();
            $table->string('Unit', 20)->nullable();
            $table->decimal('PackQty', 15, 4)->default(0);
            $table->decimal('Cost', 15, 4)->default(0);
            $table->decimal('Price', 15, 4)->default(0);
            $table->string('BatchNo', 50)->nullable();
            $table->date('MfgDate')->nullable();
            $table->date('ExpDate')->nullable();
            $table->decimal('BalQty', 15, 4)->default(0);
            $table->string('company_code', 20);
            $table->string('section_code', 20);
            $table->string('Status', 1)->default('A');
            $table->string('InUse', 1)->default('Y');
            $table->timestamps();
            
            // Composite primary key
            $table->primary(['ItmKy', 'batch_no']);
            
            // Indexes for performance
            $table->index(['ItemCode', 'batch_no'], 'idx_itemcode_batch');
            $table->index(['company_code', 'section_code', 'batch_no'], 'idx_company_section_batch');
            $table->index('ItmGrp', 'idx_itmgrp');
            $table->index('Status', 'idx_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('itemmaster');
    }
};
