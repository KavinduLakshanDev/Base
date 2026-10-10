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
            $table->uuid('uuid')->nullable()->unique()->after('batch_no');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->dropColumn('uuid');
        });
    }
};
