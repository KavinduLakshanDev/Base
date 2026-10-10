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
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropUnique('deliveries_delivery_number_unique');
            $table->unique(['delivery_number', 'company_code'], 'deliveries_delivery_number_company_unique');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropUnique('deliveries_delivery_number_company_unique');
            $table->unique('delivery_number', 'deliveries_delivery_number_unique');
        });
    }
};
