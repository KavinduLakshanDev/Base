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
        Schema::create('batch_counters', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50); // GRN, TRN, etc.
            $table->string('company_code', 20);
            $table->string('section_code', 20);
            $table->unsignedBigInteger('counter')->default(0);
            $table->timestamps();
            
            // Composite unique key to ensure one counter per type-company-section
            $table->unique(['type', 'company_code', 'section_code'], 'batch_counters_unique');
            
            // Index for performance
            $table->index(['type', 'company_code', 'section_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('batch_counters');
    }
};
