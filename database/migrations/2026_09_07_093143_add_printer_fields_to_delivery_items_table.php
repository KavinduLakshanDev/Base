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
        Schema::table('delivery_items', function (Blueprint $table) {
            $table->string('serial_number', 100)->nullable()->after('batch_no');
            $table->string('brand', 100)->nullable()->after('serial_number');
            $table->string('model', 100)->nullable()->after('brand');
            $table->string('warranty', 50)->nullable()->after('model');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_items', function (Blueprint $table) {
            $table->dropColumn(['serial_number', 'brand', 'model', 'warranty']);
        });
    }
};
