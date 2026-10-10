<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_charges', function (Blueprint $table) {
            $table->id();
            $table->string('charge_code')->unique();
            $table->string('charge_name');
            $table->text('description')->nullable();
            $table->decimal('amount', 18, 2);
            $table->enum('charge_type', ['fixed', 'hourly', 'percentage'])->default('fixed');
            $table->boolean('is_active')->default(true);
            $table->string('company_code', 255)->nullable();
            $table->string('section_code', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_charges');
    }
};