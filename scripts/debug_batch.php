<?php
use Illuminate\Support\Facades\DB;

$companyCode = 'VIS001';
$sectionCode = 'VIS-SEC-001';
$itemKeys = [104];

$stockRecords = DB::table('stock_in_hand')
    ->where('stock_in_hand.company_code', $companyCode)
    ->where('stock_in_hand.section_code', $sectionCode)
    ->whereIn('stock_in_hand.ItemKy', $itemKeys)
    ->select(
        'stock_in_hand.batch_no', 
        DB::raw('SUM(stock_in_hand.Qty + stock_in_hand.FreeQty) as total_stock')
    )
    ->groupBy('stock_in_hand.batch_no')
    ->get();

echo json_encode($stockRecords, JSON_PRETTY_PRINT) . "\n";
