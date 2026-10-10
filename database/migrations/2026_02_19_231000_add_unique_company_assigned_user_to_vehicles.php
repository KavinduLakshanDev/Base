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
        // Cleanup duplicate assignments: keep the lowest id for each (company_code, assigned_user_id)
        $duplicates = DB::table('vehicles')
            ->select('company_code', 'assigned_user_id', DB::raw('COUNT(*) as cnt'))
            ->whereNotNull('assigned_user_id')
            ->groupBy('company_code', 'assigned_user_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $dup) {
            $keepId = DB::table('vehicles')
                ->where('company_code', $dup->company_code)
                ->where('assigned_user_id', $dup->assigned_user_id)
                ->min('id');

            DB::table('vehicles')
                ->where('company_code', $dup->company_code)
                ->where('assigned_user_id', $dup->assigned_user_id)
                ->where('id', '!=', $keepId)
                ->update(['assigned_user_id' => null]);
        }

        Schema::table('vehicles', function (Blueprint $table) {
            // enforce one vehicle per sales-rep per company (NULLs allowed)
            $table->unique(['company_code', 'assigned_user_id'], 'vehicles_company_assigned_user_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropUnique('vehicles_company_assigned_user_unique');
        });
    }
};