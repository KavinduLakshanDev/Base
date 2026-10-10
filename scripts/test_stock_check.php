<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== STOCK CHECK TEST FOR ITM7458 - CR-80 pages ===\n\n";

// Step 1: Find the product by code
echo "Step 1: Finding product by code (ITM7458)...\n";
$product = DB::table('itemmaster')
    ->where('ItemCode', 'ITM7458')
    ->orWhere('ItemCode', 'LIKE', '%ITM7458%')
    ->orWhere('ItmNm', 'LIKE', '%CR-80%')
    ->first();

if ($product) {
    echo "✓ Product Found:\n";
    echo "  - ID (ItmKy): {$product->ItmKy}\n";
    echo "  - Name: {$product->ItmNm}\n";
    echo "  - Code: {$product->ItemCode}\n";
    echo "\n";
    
    $itemKy = $product->ItmKy;
} else {
    echo "✗ Product NOT found. Searching all products with 'CR-80' or 'ITM7458'...\n";
    $products = DB::table('itemmaster')
        ->where('ItmNm', 'LIKE', '%CR-80%')
        ->orWhere('ItemCode', 'LIKE', '%7458%')
        ->get();
    
    if ($products->count() > 0) {
        echo "Found {$products->count()} similar product(s):\n";
        foreach ($products as $p) {
            echo "  - [{$p->ItmKy}] {$p->ItmNm} (Code: {$p->ItemCode})\n";
        }
        $itemKy = $products->first()->ItmKy;
        echo "\nUsing first product: ItmKy = {$itemKy}\n\n";
    } else {
        echo "✗ No products found. Exiting.\n";
        exit(1);
    }
}

// Step 2: Check stock_transfers table
echo "Step 2: Checking stock_transfers table...\n";
$transfers = DB::table('stock_transfers')
    ->where('item_id', $itemKy)
    ->select('id', 'transfer_number', 'from_section_code', 'to_section_code', 'quantity', 'transfer_date', 'serial_number', 'batch_no')
    ->orderBy('transfer_date', 'desc')
    ->get();

if ($transfers->count() > 0) {
    echo "✓ Found {$transfers->count()} stock transfer record(s):\n\n";
    foreach ($transfers as $transfer) {
        echo "  Transfer #{$transfer->id} ({$transfer->transfer_number}):\n";
        echo "    From: {$transfer->from_section_code} → To: {$transfer->to_section_code}\n";
        echo "    Quantity: {$transfer->quantity}\n";
        echo "    Date: {$transfer->transfer_date}\n";
        if ($transfer->serial_number) {
            echo "    Serial: {$transfer->serial_number}\n";
        }
        if ($transfer->batch_no) {
            echo "    Batch: {$transfer->batch_no}\n";
        }
        echo "\n";
    }
    
    // Calculate net transfers by section
    $transfersBySection = DB::table('stock_transfers')
        ->where('item_id', $itemKy)
        ->selectRaw("
            to_section_code as section_code,
            'IN' as type,
            SUM(quantity) as total_quantity
        ")
        ->groupBy('to_section_code')
        ->unionAll(
            DB::table('stock_transfers')
                ->where('item_id', $itemKy)
                ->selectRaw("
                    from_section_code as section_code,
                    'OUT' as type,
                    SUM(quantity) as total_quantity
                ")
                ->groupBy('from_section_code')
        )
        ->get();
    
    echo "  Net Transfer Summary by Section:\n";
    $sectionTotals = [];
    foreach ($transfersBySection as $transfer) {
        if (!isset($sectionTotals[$transfer->section_code])) {
            $sectionTotals[$transfer->section_code] = 0;
        }
        if ($transfer->type === 'IN') {
            $sectionTotals[$transfer->section_code] += $transfer->total_quantity;
        } else {
            $sectionTotals[$transfer->section_code] -= $transfer->total_quantity;
        }
    }
    
    foreach ($sectionTotals as $section => $total) {
        $sign = $total >= 0 ? '+' : '';
        echo "    {$section}: {$sign}{$total}\n";
    }
    echo "\n";
} else {
    echo "✗ No stock transfers found for this item.\n\n";
}

// Step 3: Check stock_in_hand table
echo "Step 3: Checking stock_in_hand table...\n";
$stockRecords = DB::table('stock_in_hand')
    ->where('ItemKy', $itemKy)
    ->select('TableKy', 'OrdDate', 'Qty', 'FreeQty', 'TrnTyp', 'section_code', 'serial_number', 'batch_no', 'created_at')
    ->orderBy('TableKy', 'desc')
    ->get();

if ($stockRecords->count() > 0) {
    echo "✓ Found {$stockRecords->count()} stock record(s) in stock_in_hand:\n\n";
    
    $totalBySection = [];
    $totalByTrnTyp = [];
    $overallTotal = 0;
    
    foreach ($stockRecords as $stock) {
        echo "  Record #{$stock->TableKy}:\n";
        echo "    Date: {$stock->OrdDate}\n";
        echo "    Quantity: {$stock->Qty}\n";
        echo "    Free Qty: {$stock->FreeQty}\n";
        echo "    Type (TrnTyp): {$stock->TrnTyp}\n";
        echo "    Section: " . ($stock->section_code ?? 'N/A') . "\n";
        if ($stock->serial_number) {
            echo "    Serial: {$stock->serial_number}\n";
        }
        if ($stock->batch_no) {
            echo "    Batch: {$stock->batch_no}\n";
        }
        echo "\n";
        
        // Calculate totals
        $section = $stock->section_code ?? 'NO_SECTION';
        if (!isset($totalBySection[$section])) {
            $totalBySection[$section] = 0;
        }
        $totalBySection[$section] += $stock->Qty;
        
        $trnTyp = $stock->TrnTyp ?? 'UNKNOWN';
        if (!isset($totalByTrnTyp[$trnTyp])) {
            $totalByTrnTyp[$trnTyp] = 0;
        }
        $totalByTrnTyp[$trnTyp] += $stock->Qty;
        
        $overallTotal += $stock->Qty;
    }
    
    echo "  Summary by Section:\n";
    foreach ($totalBySection as $section => $total) {
        echo "    {$section}: {$total}\n";
    }
    echo "\n";
    
    echo "  Summary by Transaction Type:\n";
    foreach ($totalByTrnTyp as $type => $total) {
        echo "    {$type}: {$total}\n";
    }
    echo "\n";
    
    echo "  OVERALL TOTAL STOCK: {$overallTotal}\n";
    echo "\n";
} else {
    echo "✗ No stock records found in stock_in_hand for this item.\n\n";
}

// Step 4: Cross-check available stock calculation
echo "Step 4: Calculating available stock...\n";
$availableStock = DB::table('stock_in_hand')
    ->where('ItemKy', $itemKy)
    ->sum('Qty');

echo "✓ Total Available Stock (sum of all Qty): {$availableStock}\n\n";

// Step 5: Check for any wastage records
echo "Step 5: Checking wastage records...\n";
$wastages = DB::table('wastages')
    ->where('product_id', $itemKy)
    ->select('id', 'quantity', 'status', 'reason', 'wastage_date', 'serial_number', 'batch_no')
    ->orderBy('created_at', 'desc')
    ->get();

if ($wastages->count() > 0) {
    echo "✓ Found {$wastages->count()} wastage record(s):\n\n";
    $totalWastage = 0;
    $approvedWastage = 0;
    
    foreach ($wastages as $wastage) {
        echo "  Wastage #{$wastage->id}:\n";
        echo "    Quantity: {$wastage->quantity}\n";
        echo "    Status: {$wastage->status}\n";
        echo "    Reason: {$wastage->reason}\n";
        echo "    Date: {$wastage->wastage_date}\n";
        if ($wastage->serial_number) {
            echo "    Serial: {$wastage->serial_number}\n";
        }
        if ($wastage->batch_no) {
            echo "    Batch: {$wastage->batch_no}\n";
        }
        echo "\n";
        
        $totalWastage += $wastage->quantity;
        if ($wastage->status === 'approved') {
            $approvedWastage += $wastage->quantity;
        }
    }
    
    echo "  Total Wastage (all): {$totalWastage}\n";
    echo "  Approved Wastage: {$approvedWastage}\n\n";
} else {
    echo "✗ No wastage records found for this item.\n\n";
}

echo "=== TEST COMPLETED ===\n";
