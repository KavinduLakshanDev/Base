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
        Schema::create('control_masters', function (Blueprint $table) {
            $table->id();
            $table->uuid();
            $table->string('concode', 10);
            $table->string('conkey', 10)->unique();
            $table->string('conname', 100);
            $table->string('company_code', 255);
            $table->string('section_code', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('control_masters');
    }
};