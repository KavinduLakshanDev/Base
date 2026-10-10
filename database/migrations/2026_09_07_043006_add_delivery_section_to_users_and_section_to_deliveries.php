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
        Schema::table('users', function (Blueprint $table) {
            $table->string('delivery_section_code', 50)->nullable()->after('section_code');
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('section_code', 50)->nullable()->after('vehicle_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('delivery_section_code');
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn('section_code');
        });
    }
};
