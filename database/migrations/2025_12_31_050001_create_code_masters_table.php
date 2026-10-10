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
        Schema::create('code_masters', function (Blueprint $table) {
            $table->id();
            $table->uuid();
            $table->string('conkey', 10);
            $table->string('concode', 20);
            $table->string('catkey', 20);
            $table->string('cname', 100);
            $table->text('description')->nullable();
            $table->string('company_code', 255);
            $table->string('section_code', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('conkey')->references('conkey')->on('control_masters');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('code_masters');
    }
};