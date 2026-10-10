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
        Schema::create('PrivilagePoint', function (Blueprint $table) {
            $table->id();

            // Multi-tenant fields
            $table->string('company_code');
            $table->string('section_code');

            // Core fields
            $table->boolean('finAct')->default(true);
            $table->string('status')->default('active');
            $table->string('tabelKey')->nullable();
            $table->string('customer_code');
            $table->date('pointDate');
            $table->decimal('pointAmount', 15, 2);
            $table->string('ordNo')->nullable();
            $table->string('cardNo')->nullable();
            $table->boolean('claimed')->default(false);
            $table->string('entuser')->nullable();
            $table->string('pointType'); // 'earned', 'redeemed'
            $table->uuid('uuid')->nullable();

            $table->timestamps();

            // Indexes for better performance
            $table->index(['company_code', 'section_code']);
            $table->index('customer_code');
            $table->index('pointDate');
            $table->index('claimed');
            $table->index('pointType');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('PrivilagePoint');
    }
};
