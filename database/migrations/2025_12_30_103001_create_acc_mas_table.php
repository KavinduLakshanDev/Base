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
        Schema::create('acc_mas', function (Blueprint $table) {
            $table->string('Status', 2)->nullable();
            $table->integer('AccKy')->unsigned()->autoIncrement(); // PK
            $table->uuid('uuid')->nullable();
            $table->string('AccCd', 50)->nullable();
            $table->string('AccNm', 60)->nullable();
            $table->string('AccTyp', 10)->nullable();
            $table->string('company_code', 255)->nullable();
            $table->string('section_code', 255)->nullable();
            $table->decimal('CurBal', 18, 2)->nullable();
            $table->decimal('CrLmt', 18, 2)->nullable();
            $table->boolean('fVATRegistered')->nullable();
            $table->string('VATNo', 50)->nullable();
            $table->integer('AriaKy')->nullable();
            $table->string('BnkAccNo', 20)->nullable();
            $table->dateTime('EnDtm')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acc_mas');
    }
};
