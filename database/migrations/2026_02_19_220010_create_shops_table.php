<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('shops', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('address')->nullable();
            $table->string('contact_phone')->nullable();
            $table->unsignedInteger('external_customer_id')->nullable();
            $table->string('company_code')->index();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Reference to address (customers) table via AdrKy primary key
            $table->foreign('external_customer_id')->references('AdrKy')->on('address')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('shops');
    }
};