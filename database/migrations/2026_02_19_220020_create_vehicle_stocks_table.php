<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('vehicle_stocks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('vehicle_id');
            $table->unsignedBigInteger('item_ky');
            $table->string('batch_no')->nullable();
            $table->string('serial_number')->nullable();
            $table->decimal('quantity', 15, 3)->default(0);
            $table->decimal('reserved_quantity', 15, 3)->default(0);
            $table->string('company_code')->index();
            $table->date('last_date')->nullable();
            $table->timestamps();

            $table->foreign('vehicle_id')->references('id')->on('vehicles')->onDelete('cascade');
            $table->index(['vehicle_id', 'item_ky', 'batch_no']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('vehicle_stocks');
    }
};