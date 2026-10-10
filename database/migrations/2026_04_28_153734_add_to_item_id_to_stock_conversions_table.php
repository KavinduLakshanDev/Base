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
        Schema::table('stock_conversions', function (Blueprint $table) {
            $table->string('to_item_id')->nullable()->after('item_name');
            $table->string('to_item_code')->nullable()->after('to_item_id');
            $table->string('to_item_name')->nullable()->after('to_item_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_conversions', function (Blueprint $table) {
            $table->dropColumn(['to_item_id', 'to_item_code', 'to_item_name']);
        });
    }
};
