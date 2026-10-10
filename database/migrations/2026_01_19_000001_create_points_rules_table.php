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
        Schema::create('points_rules', function (Blueprint $table) {
            $table->id();
            $table->string('company_code', 10);
            $table->foreign('company_code')->references('company_code')->on('companies');
            $table->decimal('currency_amount', 10, 2); // Amount in currency (e.g., 100.00 Rs)
            $table->integer('points_earned'); // Points earned for that amount (e.g., 1)
            $table->unique('company_code');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('points_rules');
    }
};
