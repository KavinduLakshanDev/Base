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
        Schema::create('address', function (Blueprint $table) {
            $table->string('Status', 2)->nullable();
            $table->integer('AdrKy')->unsigned()->autoIncrement(); // PK
            $table->string('company_code', 255)->nullable();
            $table->string('section_code', 255)->nullable();
            $table->string('AdrCd', 30)->nullable();
            $table->string('CtPerson', 100)->nullable();
            $table->string('FstNm', 60)->nullable();
            $table->string('IDNo', 50)->nullable();
            $table->string('Title', 30)->nullable();
            $table->string('Address', 250)->nullable();
            $table->string('Country', 60)->nullable();
            $table->integer('AdrTypKy')->nullable();
            $table->string('TP1', 30)->nullable();
            $table->string('TP2', 30)->nullable();
            $table->string('TP3', 30)->nullable();
            $table->string('Fax', 30)->nullable();
            $table->string('Email', 100)->nullable();
            $table->string('Website', 100)->nullable();
            $table->integer('AccKy')->unsigned()->nullable();
            $table->uuid('uuid')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('address');
    }
};
