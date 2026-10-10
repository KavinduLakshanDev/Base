<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fix the RefNo values stored in stock_in_hand for reverse conversions.
 *
 * Before this migration the executeConversion() method used the same CNV- prefix
 * for both forward AND reverse conversions:
 *
 *   Forward (bundle → NOS):  CNV-OUT-{id}  (bundle debit)   CNV-IN-{id}  (NOS credit)
 *   Reverse (NOS → bundle):  CNV-OUT-{id}  (NOS debit) ❌   CNV-IN-{id}  (bundle credit) ❌
 *
 * The SalesController split-stock logic treats all CNV-IN% rows as NOS credits,
 * causing the reverse-conversion bundle credits to be counted in nos_stock and
 * the NOS debits to be counted in bundle_stock — both wrong.
 *
 * After the model fix, new reverse conversions use RCNV- prefix:
 *   RCNV-OUT-{id}  (NOS debit)     → goes to nos_stock  ✓
 *   RCNV-IN-{id}   (bundle credit) → goes to bundle_stock ✓
 *
 * This migration re-labels all existing reverse-conversion stock_in_hand rows
 * to the new RCNV- prefix so they are correctly categorised.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Fetch all reverse conversion IDs
        $reverseIds = DB::table('stock_conversions')
            ->where('reverse', 1)
            ->pluck('id');

        if ($reverseIds->isEmpty()) {
            return;
        }

        // Update in chunks to avoid huge IN() clauses
        foreach ($reverseIds->chunk(500) as $chunk) {
            // CNV-OUT-{id}  →  RCNV-OUT-{id}
            foreach ($chunk as $id) {
                DB::table('stock_in_hand')
                    ->where('RefNo', 'CNV-OUT-' . $id)
                    ->update(['RefNo' => 'RCNV-OUT-' . $id]);

                // CNV-IN-{id}  →  RCNV-IN-{id}
                DB::table('stock_in_hand')
                    ->where('RefNo', 'CNV-IN-' . $id)
                    ->update(['RefNo' => 'RCNV-IN-' . $id]);
            }
        }
    }

    public function down(): void
    {
        // Reverse: rename RCNV- back to CNV- for all reverse conversion rows
        $reverseIds = DB::table('stock_conversions')
            ->where('reverse', 1)
            ->pluck('id');

        if ($reverseIds->isEmpty()) {
            return;
        }

        foreach ($reverseIds->chunk(500) as $chunk) {
            foreach ($chunk as $id) {
                DB::table('stock_in_hand')
                    ->where('RefNo', 'RCNV-OUT-' . $id)
                    ->update(['RefNo' => 'CNV-OUT-' . $id]);

                DB::table('stock_in_hand')
                    ->where('RefNo', 'RCNV-IN-' . $id)
                    ->update(['RefNo' => 'CNV-IN-' . $id]);
            }
        }
    }
};
