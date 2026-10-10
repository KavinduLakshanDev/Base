<?php
use Illuminate\Support\Facades\DB;

$companyCode = 'VIS001';
$sectionCode = 'VIS-SEC-001';
$itemKeys = [104];

$stockRecords = DB::table('stock_in_hand')
    ->where('stock_in_hand.company_code', $companyCode)
    ->where('stock_in_hand.section_code', $sectionCode)
    ->whereIn('stock_in_hand.ItemKy', $itemKeys)
    ->leftJoin('itemmaster as im', 'stock_in_hand.ItemKy', '=', 'im.ItmKy')
    ->select(
        'stock_in_hand.ItemKy', 
        'stock_in_hand.batch_no', 
        'stock_in_hand.UnitKy', 
        'stock_in_hand.RefNo', 
        'stock_in_hand.TrnTyp', 
        DB::raw('SUM(stock_in_hand.Qty + stock_in_hand.FreeQty) as total_stock')
    )
    ->groupBy(
        'stock_in_hand.ItemKy', 
        'stock_in_hand.UnitKy', 
        'stock_in_hand.batch_no', 
        'stock_in_hand.RefNo', 
        'stock_in_hand.TrnTyp'
    )
    ->get();

echo 'Sum in section 1: ' . $stockRecords->sum('total_stock') . "\n";

$stockRecords2 = DB::table('stock_in_hand')
    ->where('stock_in_hand.company_code', $companyCode)
    // ->where('stock_in_hand.section_code', $sectionCode)
    ->whereIn('stock_in_hand.ItemKy', $itemKeys)
    ->leftJoin('itemmaster as im', 'stock_in_hand.ItemKy', '=', 'im.ItmKy')
    ->select(
        'stock_in_hand.ItemKy', 
        'stock_in_hand.batch_no', 
        'stock_in_hand.UnitKy', 
        'stock_in_hand.RefNo', 
        'stock_in_hand.TrnTyp', 
        DB::raw('SUM(stock_in_hand.Qty + stock_in_hand.FreeQty) as total_stock')
    )
    ->groupBy(
        'stock_in_hand.ItemKy', 
        'stock_in_hand.UnitKy', 
        'stock_in_hand.batch_no', 
        'stock_in_hand.RefNo', 
        'stock_in_hand.TrnTyp'
    )
    ->get();
echo 'Sum in all sections: ' . $stockRecords2->sum('total_stock') . "\n";
