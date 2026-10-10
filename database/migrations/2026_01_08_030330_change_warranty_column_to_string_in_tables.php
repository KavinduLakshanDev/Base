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
            $table->string('warranty', 50)->nullable()->change();
        });

        Schema::table('purchase_det', function (Blueprint $table) {
            $table->string('warranty', 50)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->enum('warranty', ['3months', '6months', '12 months','1 year', '2 years', '5 years'])->nullable()->change();
        });

        Schema::table('purchase_det', function (Blueprint $table) {
            $table->enum('warranty', ['3months', '6months', '1year', '2years', '5years'])->nullable()->change();
        });
    }
};
