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
        Schema::table('stock_in_hand', function (Blueprint $table) {
            // Change ItemKy from unsignedBigInteger to string to match itemmaster.ItmKy
            $table->string('ItemKy', 50)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            // Revert ItemKy back to unsignedBigInteger
            $table->unsignedBigInteger('ItemKy')->nullable()->change();
        });
    }
};
