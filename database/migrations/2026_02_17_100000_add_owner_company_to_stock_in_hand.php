<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            // Add owner_company_code to track true ownership (separate from location)
            $table->string('owner_company_code', 10)->nullable()->after('company_code')->index();
        });

        // Backfill existing records: owner = company for existing stock
        DB::statement("
            UPDATE stock_in_hand 
            SET owner_company_code = company_code 
            WHERE owner_company_code IS NULL
        ");

        // Make it non-nullable after backfill
        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->string('owner_company_code', 10)->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->dropIndex(['owner_company_code']);
            $table->dropColumn('owner_company_code');
        });
    }
};
