<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('delivery_route_shop', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('delivery_route_id');
            $table->unsignedBigInteger('shop_id');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('delivery_route_id')->references('id')->on('delivery_routes')->onDelete('cascade');
            $table->foreign('shop_id')->references('id')->on('shops')->onDelete('cascade');
            $table->unique(['delivery_route_id', 'shop_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('delivery_route_shop');
    }
};