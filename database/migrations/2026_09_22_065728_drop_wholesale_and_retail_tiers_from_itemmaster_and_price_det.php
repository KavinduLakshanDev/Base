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
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropColumn(['wholesale_min_qty', 'RtQty3', 'RtDis3', 'RtQty4', 'RtDis4', 'free_issue_scheme_buy_qty', 'free_issue_scheme_get_qty']);
        });

        Schema::table('item_price_det', function (Blueprint $table) {
            $table->dropColumn(['RtQty3', 'RtDis3', 'RtQty4', 'RtDis4']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->integer('wholesale_min_qty')->nullable();
            $table->integer('RtQty3')->nullable();
            $table->decimal('RtDis3', 10, 4)->nullable();
            $table->integer('RtQty4')->nullable();
            $table->decimal('RtDis4', 10, 4)->nullable();
            $table->integer('free_issue_scheme_buy_qty')->nullable();
            $table->integer('free_issue_scheme_get_qty')->nullable();
        });

        Schema::table('item_price_det', function (Blueprint $table) {
            $table->integer('RtQty3')->nullable();
            $table->decimal('RtDis3', 10, 4)->nullable();
            $table->integer('RtQty4')->nullable();
            $table->decimal('RtDis4', 10, 4)->nullable();
        });
    }
};
