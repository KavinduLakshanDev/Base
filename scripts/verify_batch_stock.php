<?php
/**
 * Stock Verification Script
 * Verifies batch stock calculations are working correctly
 * 
 * Usage: php verify_batch_stock.php <item_code> <batch_no>
 * Example: php verify_batch_stock.php 655667744 GRN-VIS-VIS-4848
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\StockInHand;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

// Get command line arguments
$itemCode = $argv[1] ?? null;
$batchNo = $argv[2] ?? null;

if (!$itemCode || !$batchNo) {
    echo "Usage: php verify_batch_stock.php <item_code> <batch_no>\n";
    echo "Example: php verify_batch_stock.php 655667744 GRN-VIS-VIS-4848\n";
    exit(1);
}

echo "=== Batch Stock Verification ===\n";
echo "Item Code: {$itemCode}\n";
echo "Batch No: {$batchNo}\n\n";

// Find the product
$product = Product::where('ItemCode', $itemCode)->first();

if (!$product) {
    echo "❌ ERROR: Product not found with item code {$itemCode}\n";
    exit(1);
}

echo "✓ Product Found: {$product->ItmNm} (ID: {$product->ItmKy})\n\n";

// Get all stock records for this batch
$stockRecords = StockInHand::where('ItemKy', $product->ItmKy)
    ->where('batch_no', $batchNo)
    ->orderBy('TableKy')
    ->get();

if ($stockRecords->isEmpty()) {
    echo "❌ No stock records found for this batch\n";
    exit(1);
}

echo "=== Stock Transaction History ===\n";
$positiveTotal = 0;
$negativeTotal = 0;

foreach ($stockRecords as $record) {
    $qty = $record->Qty + ($record->FreeQty ?? 0);
    if ($qty > 0) {
        $positiveTotal += $qty;
        $sign = '+';
    } else {
        $negativeTotal += abs($qty);
        $sign = '';
    }
    
    echo sprintf(
        "ID %-5s: %s%-7.2f (%s) [%s] Section: %s\n",
        $record->TableKy,
        $sign,
        $qty,
        $record->TrnTyp,
        $record->OrdDate->format('Y-m-d'),
        $record->section_code
    );
}

$netStock = $stockRecords->sum(function($r) { 
    return $r->Qty + ($r->FreeQty ?? 0); 
});

echo "\n=== Summary ===\n";
echo "Total Additions: +{$positiveTotal}\n";
echo "Total Deductions: -{$negativeTotal}\n";
echo "Net Stock: {$netStock}\n\n";

// Verify using the actual API logic (getProductBatches equivalent)
echo "=== API Verification (getProductBatches logic) ===\n";
$batchStock = StockInHand::where('ItemKy', $product->ItmKy)
    ->where('batch_no', $batchNo)
    ->selectRaw('SUM(Qty + COALESCE(FreeQty, 0)) as total')
    ->value('total') ?? 0;

echo "Calculated via API logic: {$batchStock}\n";

// Check by section
$stockBySection = StockInHand::where('ItemKy', $product->ItmKy)
    ->where('batch_no', $batchNo)
    ->select('section_code', DB::raw('SUM(Qty + COALESCE(FreeQty, 0)) as total'))
    ->groupBy('section_code')
    ->get();

if ($stockBySection->count() > 1) {
    echo "\n=== Stock by Section ===\n";
    foreach ($stockBySection as $sectionStock) {
        echo "  Section {$sectionStock->section_code}: {$sectionStock->total}\n";
    }
}

echo "\n";

// Final verdict
if ($netStock == $batchStock) {
    echo "✅ VERIFICATION PASSED\n";
    echo "   Net stock matches API calculation: {$netStock} units\n";
} else {
    echo "❌ VERIFICATION FAILED\n";
    echo "   Net stock ({$netStock}) does not match API ({$batchStock})\n";
    exit(1);
}

echo "\n=== Transaction Type Legend ===\n";
echo "GRN        - Goods Received Note (adds stock)\n";
echo "WASTAGE    - Wastage deduction (removes stock)\n";
echo "WST_RESTO  - Wastage restoration (adds stock back)\n";
echo "SALE       - Sales deduction (removes stock)\n";
echo "RETURN     - Sales return (adds stock back)\n";
echo "TRANSFER   - Stock transfer (removes from source)\n";
echo "TRF_IN     - Transfer in (adds to destination)\n";
