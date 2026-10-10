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
        Schema::create('privilege_users', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->nullable();

            // Multi-tenant fields
            $table->string('company_code');
            $table->string('section_code');

            // Customer identification
            $table->string('customer_code')->unique();
            $table->string('privCusName');
            $table->string('NIC')->nullable();

            // Address information
            $table->text('address');
            $table->string('town')->nullable();
            $table->string('city');
            $table->string('country')->default('Sri Lanka');

            // Contact information
            $table->string('phone')->nullable();

            // Gender
            $table->enum('gender', ['male', 'female'])->nullable();

            // Additional fields
            $table->string('card_no')->nullable();
            $table->date('regdate');
            $table->string('ent_user')->nullable();
            $table->boolean('finAct')->default(true);

            // Status and metadata
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

            $table->timestamps();

            // Foreign key constraints
            $table->foreign('company_code')->references('company_code')->on('companies')->onDelete('cascade');
            $table->foreign('section_code')->references('section_code')->on('sections')->onDelete('cascade');

            // Indexes for better performance
            $table->index(['company_code', 'section_code']);
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('privilege_users');
    }
};