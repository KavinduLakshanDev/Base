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
            if (!Schema::hasColumn('itemmaster', 'BarCode')) {
                $table->string('BarCode', 100)->nullable()->after('ItemCode');
                $table->index('BarCode');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            if (Schema::hasColumn('itemmaster', 'BarCode')) {
                $table->dropColumn('BarCode');
            }
        });
    }
};
