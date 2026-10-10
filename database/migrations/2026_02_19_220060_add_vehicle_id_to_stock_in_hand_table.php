<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->unsignedBigInteger('vehicle_id')->nullable()->after('section_code');
            $table->foreign('vehicle_id')->references('id')->on('vehicles')->onDelete('set null');
            $table->index('vehicle_id');
            $table->index(['ItemKy', 'vehicle_id']);
        });
    }

    public function down()
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->dropForeign(['vehicle_id']);
            $table->dropColumn('vehicle_id');
        });
    }
};