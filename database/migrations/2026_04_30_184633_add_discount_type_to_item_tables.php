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
            $table->string('RtDisType1', 20)->default('fixed')->after('RtDis1');
        });

        Schema::table('item_price_det', function (Blueprint $table) {
            $table->string('RtDisType1', 20)->default('fixed')->after('RtDis1');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropColumn('RtDisType1');
        });

        Schema::table('item_price_det', function (Blueprint $table) {
            $table->dropColumn('RtDisType1');
        });
    }
};
