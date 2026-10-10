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
        if (Schema::hasTable('purchase')) {
            Schema::table('purchase', function (Blueprint $table) {
                // Ensure company-wide purchase numbers stay unique.  Already use thread-safe
                // generation in code, but this guard prevents accidental duplicates.
                $table->unique(['company_code', 'PurchaseNo'], 'purchase_company_number_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('purchase')) {
            Schema::table('purchase', function (Blueprint $table) {
                $table->dropUnique('purchase_company_number_unique');
            });
        }
    }
};