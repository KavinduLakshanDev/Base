<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_conversions', function (Blueprint $table) {
            $table->boolean('reverse')->default(false)->after('conversion_factor');
        });
    }

    public function down(): void
    {
        Schema::table('stock_conversions', function (Blueprint $table) {
            $table->dropColumn('reverse');
        });
    }
};
