<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Strategy: Enforce serial uniqueness at the REGISTRATION point (purchase_det)
     * not at the general stock tracking point (stock_in_hand).
     * 
     * Why: stock_in_hand has multiple transaction types (GRN, TRF-OUT, TRF-IN, WASTAGE, etc.)
     * All legitimate transactions need to be recorded there. Only GRN registrations should be unique.
     */
    public function up(): void
    {
        // First, clean up duplicate serials in purchase_det by keeping only the earliest entry per serial
        DB::statement("
            DELETE pd FROM purchase_det pd
            WHERE pd.PerchaseDetKy NOT IN (
                SELECT MIN(PerchaseDetKy)
                FROM (
                    SELECT MIN(PerchaseDetKy) as PerchaseDetKy
                    FROM purchase_det
                    WHERE company_code IS NOT NULL 
                      AND section_code IS NOT NULL 
                      AND serial_number IS NOT NULL
                      AND serial_number != ''
                    GROUP BY company_code, section_code, serial_number
                ) t
            )
            AND company_code IS NOT NULL 
            AND section_code IS NOT NULL 
            AND serial_number IS NOT NULL
            AND serial_number != ''
        ");

        // Add unique constraint to purchase_det only
        // This prevents duplicate serial registrations at the point of purchase/GRN entry
        Schema::table('purchase_det', function (Blueprint $table) {
            if (!Schema::hasIndex('purchase_det', 'idx_unique_serial_per_section')) {
                $table->unique(['company_code', 'section_code', 'serial_number'], 'idx_unique_serial_per_section');
            }
        });

        // For stock_in_hand, we don't add a blanket unique constraint because:
        // - It tracks all movements (GRN, transfers, wastage, etc.)
        // - Multiple transaction types for the same serial are legitimate
        // - Instead, we rely on the purchase_det uniqueness for GRN validation
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_det', function (Blueprint $table) {
            $table->dropUnique('idx_unique_serial_per_section');
        });
    }
};
