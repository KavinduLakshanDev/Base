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
        Schema::create('temp_PrivilagePoint', function (Blueprint $table) {
            $table->id();
            $table->string('company_code');
            $table->string('section_code');
            $table->boolean('finAct')->default(true);
            $table->string('customer_code');
            $table->string('status')->default('active');
            $table->string('pointKey')->nullable();
            $table->date('pointDate')->nullable();
            $table->string('ordNo')->nullable();
            $table->string('cardNo')->nullable();
            $table->boolean('claimed')->default(false);
            $table->string('entuser')->nullable();
            $table->decimal('pointAmount', 15, 2);
            $table->uuid('uuid')->nullable();
            $table->timestamps();

            $table->index(['company_code', 'section_code']);
            $table->index('customer_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('temp_PrivilagePoint');
    }
};
