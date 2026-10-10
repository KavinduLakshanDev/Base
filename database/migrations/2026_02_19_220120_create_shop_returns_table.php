<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('shop_returns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_id');
            $table->unsignedBigInteger('vehicle_id')->nullable();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->string('company_code')->index();
            $table->date('return_date')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();

            $table->foreign('shop_id')->references('id')->on('shops')->onDelete('cascade');
            $table->foreign('vehicle_id')->references('id')->on('vehicles')->onDelete('set null');
            $table->foreign('recorded_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('shop_return_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_return_id');
            $table->unsignedBigInteger('item_ky');
            $table->string('batch_no')->nullable();
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('shop_return_id')->references('id')->on('shop_returns')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('shop_return_items');
        Schema::dropIfExists('shop_returns');
    }
};