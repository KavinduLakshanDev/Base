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
        Schema::create('acc_trn', function (Blueprint $table) {
            $table->bigInteger('AccTrnKy')->unsigned()->autoIncrement(); // PK
            $table->bigInteger('original_payment_id')->unsigned()->nullable();
            $table->boolean('FInAct')->nullable();
            $table->string('Status', 2)->nullable();
            $table->dateTime('TrnDt')->nullable();
            $table->decimal('Amt', 18, 2)->nullable();
            $table->string('BankNm', 35)->nullable();
            $table->string('BranchNm', 50)->nullable();
            $table->string('Dec', 200)->nullable();
            $table->integer('PurKy')->nullable();
            $table->integer('TrnKy')->nullable();
            $table->integer('AccKy')->unsigned()->nullable();
            $table->string('customer_code', 50)->nullable();
            $table->string('customer_name', 100)->nullable();
            $table->uuid('uuid')->nullable();
            $table->string('TrnNo', 50)->nullable();
            $table->string('VaucherNo', 50)->nullable();
            $table->integer('PayTrmKy')->nullable();
            $table->string('ChqueNo', 35)->nullable();
            $table->string('ReferenceNo', 50)->nullable();
            $table->dateTime('RBDT')->nullable();
            $table->boolean('FChqDet')->nullable();
            $table->boolean('FReturn')->nullable();
            $table->dateTime('RtnDt')->nullable();
            $table->string('Reason', 50)->nullable();
            $table->integer('AccTrnTyp1Ky')->nullable();
            $table->integer('AccTrnTyp2Ky')->nullable();
            $table->integer('AccTrnTyp3Ky')->nullable();
            $table->string('company_code', 255)->nullable();
            $table->string('section_code', 255)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acc_trn');
    }
};
