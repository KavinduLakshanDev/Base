<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->unsignedBigInteger('vehicle_id')->nullable()->after('assigned_user_id');
            $table->unsignedBigInteger('shop_id')->nullable()->after('vehicle_id');

            $table->foreign('vehicle_id')->references('id')->on('vehicles')->onDelete('set null');
            $table->foreign('shop_id')->references('id')->on('shops')->onDelete('set null');

            $table->index(['vehicle_id', 'shop_id']);
        });
    }

    public function down()
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropForeign(['vehicle_id']);
            $table->dropForeign(['shop_id']);
            $table->dropColumn(['vehicle_id', 'shop_id']);
        });
    }
};