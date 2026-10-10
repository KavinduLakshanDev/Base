<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->unsignedBigInteger('delivery_route_id')->nullable()->after('external_customer_id');
            $table->foreign('delivery_route_id')->references('id')->on('delivery_routes')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropForeign(['delivery_route_id']);
            $table->dropColumn('delivery_route_id');
        });
    }
};