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
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->string('company_code');
            $table->string('section_code');
            $table->string('phone_number', 20);
            $table->string('code', 10);
            $table->string('type')->default('verification'); // verification, password_reset, etc.
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->boolean('is_used')->default(false);
            $table->integer('attempts')->default(0);
            $table->string('reference_id')->nullable();
            $table->string('reference_type')->nullable();
            $table->timestamps();

            $table->index(['phone_number', 'code', 'is_used']);
            $table->index(['company_code', 'section_code']);
            $table->index(['expires_at', 'is_used']);
            $table->index(['reference_id', 'reference_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('otp_codes');
    }
};