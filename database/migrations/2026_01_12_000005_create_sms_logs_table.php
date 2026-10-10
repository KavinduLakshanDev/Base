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
        Schema::create('sms_logs', function (Blueprint $table) {
            $table->id();
            $table->string('company_code');
            $table->string('section_code');
            $table->string('phone_number', 20);
            $table->text('message');
            $table->string('reference_id')->nullable();
            $table->string('reference_type')->default('general');
            $table->enum('status', ['pending', 'sent', 'delivered', 'failed'])->default('pending');
            $table->string('provider')->default('simulated');
            $table->string('provider_message_id')->nullable();
            $table->decimal('cost', 8, 4)->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->index(['phone_number', 'status']);
            $table->index(['company_code', 'section_code']);
            $table->index(['reference_id', 'reference_type']);
            $table->index(['provider', 'status']);
            $table->index(['sent_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sms_logs');
    }
};