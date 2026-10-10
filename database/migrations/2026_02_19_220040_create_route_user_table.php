<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('delivery_route_user', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('delivery_route_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();

            $table->foreign('delivery_route_id')->references('id')->on('delivery_routes')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['delivery_route_id', 'user_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('delivery_route_user');
    }
};