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
        Schema::table('address', function (Blueprint $table) {
            $table->unique(['company_code', 'AdrCd'], 'address_company_adrcd_unique');
        });

        Schema::table('acc_mas', function (Blueprint $table) {
            $table->unique(['company_code', 'AccCd'], 'acc_mas_company_acccd_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('address_and_acc_mas', function (Blueprint $table) {
            //
        });
    }
};
