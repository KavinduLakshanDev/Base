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
        Schema::table('purchase_det', function (Blueprint $column) {
            $column->string('discount_type')->nullable()->after('DiscountRate')->comment('fixed or percentage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_det', function (Blueprint $column) {
            $column->dropColumn('discount_type');
        });
    }
};
