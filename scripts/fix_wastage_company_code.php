<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\StockInHand;
use App\Models\Section;

echo "=== Fixing Wastage Records with Wrong Company Code ===\n\n";

// Find all wastage records where company_code doesn't match the section's company_code
$wastageRecords = DB::table('stock_in_hand as sih')
    ->join('sections as s', 'sih.section_code', '=', 's.section_code')
    ->leftJoin('companies as c', 's.company_code', '=', 'c.company_code')
    ->where('sih.TrnTyp', 'WASTAGE')
    ->whereRaw('sih.company_code != s.company_code')
    ->select('sih.TableKy', 'sih.section_code', 'sih.company_code as current_company', 's.company_code as correct_company', 'c.id as company_id', 'sih.ItemKy', 'sih.batch_no', 'sih.Qty')
    ->get();

echo "Found " . $wastageRecords->count() . " wastage records with incorrect company_code:\n\n";

if ($wastageRecords->isEmpty()) {
    echo "No records to fix!\n";
    exit(0);
}

foreach ($wastageRecords as $record) {
    echo "Record #{$record->TableKy}:\n";
    echo "  Section: {$record->section_code}\n";
    echo "  Current Company: {$record->current_company}\n";
    echo "  Correct Company: {$record->correct_company}\n";
    echo "  Item: {$record->ItemKy}\n";
    echo "  Batch: " . ($record->batch_no ?? 'NULL') . "\n";
    echo "  Qty: {$record->Qty}\n";
    echo "---\n";
}

echo "\nFixing records...\n";

$fixed = 0;
foreach ($wastageRecords as $record) {
    $updated = DB::table('stock_in_hand')
        ->where('TableKy', $record->TableKy)
        ->update([
            'company_code' => $record->correct_company,
            'Cky' => $record->company_id,
        ]);
    
    if ($updated) {
        $fixed++;
        echo "✓ Fixed record #{$record->TableKy}\n";
    } else {
        echo "✗ Failed to fix record #{$record->TableKy}\n";
    }
}

echo "\nFixed {$fixed} out of " . $wastageRecords->count() . " records.\n";

// Also check and fix WST_RESTO records
echo "\n=== Checking WST_RESTO Records ===\n";

$restoreRecords = DB::table('stock_in_hand as sih')
    ->join('sections as s', 'sih.section_code', '=', 's.section_code')
    ->leftJoin('companies as c', 's.company_code', '=', 'c.company_code')
    ->where('sih.TrnTyp', 'WST_RESTO')
    ->whereRaw('sih.company_code != s.company_code')
    ->select('sih.TableKy', 'sih.section_code', 'sih.company_code as current_company', 's.company_code as correct_company', 'c.id as company_id')
    ->get();

if ($restoreRecords->isNotEmpty()) {
    echo "Found " . $restoreRecords->count() . " restoration records with incorrect company_code:\n\n";
    
    foreach ($restoreRecords as $record) {
        $updated = DB::table('stock_in_hand')
            ->where('TableKy', $record->TableKy)
            ->update([
                'company_code' => $record->correct_company,
                'Cky' => $record->company_id,
            ]);
        
        if ($updated) {
            echo "✓ Fixed WST_RESTO record #{$record->TableKy}\n";
        }
    }
} else {
    echo "No WST_RESTO records to fix.\n";
}

echo "\n=== Verification ===\n";

// Verify the fix
$remainingIssues = DB::table('stock_in_hand as sih')
    ->join('sections as s', 'sih.section_code', '=', 's.section_code')
    ->whereIn('sih.TrnTyp', ['WASTAGE', 'WST_RESTO'])
    ->whereRaw('sih.company_code != s.company_code')
    ->count();

if ($remainingIssues > 0) {
    echo "⚠ Warning: Still {$remainingIssues} records with mismatched company_code.\n";
} else {
    echo "✓ All wastage and restoration records now have correct company_code!\n";
}

echo "\nDone!\n";
