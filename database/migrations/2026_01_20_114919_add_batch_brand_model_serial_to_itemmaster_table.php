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
            $table->string('batch_no', 100)->nullable()->after('BarCode');
            $table->string('brand', 100)->nullable()->after('batch_no');
            $table->string('model', 100)->nullable()->after('brand');
            $table->string('serial_number', 100)->nullable()->after('model');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropColumn(['batch_no', 'brand', 'model', 'serial_number']);
        });
    }
};
