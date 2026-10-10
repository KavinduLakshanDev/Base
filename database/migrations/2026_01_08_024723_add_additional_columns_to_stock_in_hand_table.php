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
            if (!Schema::hasColumn('stock_in_hand', 'brand')) {
                $table->string('brand', 255)->nullable();
            }
            if (!Schema::hasColumn('stock_in_hand', 'model')) {
                $table->string('model', 255)->nullable();
            }
            if (!Schema::hasColumn('stock_in_hand', 'serial_number')) {
                $table->string('serial_number', 255)->nullable();
            }
            if (!Schema::hasColumn('stock_in_hand', 'warranty')) {
                $table->enum('warranty', ['3months', '6months', '12 months','1 year', '2 years', '5 years'])->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->dropColumn(['brand', 'model', 'serial_number', 'warranty']);
        });
    }
};
