<?php

use App\Models\StockConversion;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Testing Reverse Stock Conversion...\n";

try {
    // 1. Find a valid section and items to test with
    $companyCode = 'VIS'; // assuming VISMASS
    
    // Find a bundle item and a discrete item
    $items = Product::where('itemmaster.company_code', 'LIKE', 'VIS%')->limit(2)->get();
    if ($items->count() < 2) {
        die("Not enough items to test.\n");
    }

    $bundleItem = $items[0];
    $unitItem = $items[1];
    $sectionCode = 'VIS-SEC-001';

    // Ensure there is stock for the source item (the discrete unit)
    $stock = DB::table('stock_in_hand')
        ->where('section_code', $sectionCode)
        ->where('ItemKy', $unitItem->ItmKy)
        ->whereRaw('(Qty + COALESCE(FreeQty,0)) > 0')
        ->first();
        
    if (!$stock) {
        echo "No stock found for unit item {$unitItem->ItmKy} in $sectionCode. Creating dummy stock...\n";
        
        DB::table('stock_in_hand')->insert([
            'uuid'              => (string) \Illuminate\Support\Str::uuid(),
            'RefNo'             => 'TEST-STK-001',
            'company_code'      => $companyCode,
            'owner_company_code'=> $companyCode,
            'section_code'      => $sectionCode,
            'OrdDate'           => now(),
            'ItemKy'            => $unitItem->ItmKy,
            'batch_no'          => 'BATCH-TEST',
            'serial_number'     => null,
            'Qty'               => 100,
            'FreeQty'           => 0,
            'TrnTyp'            => 'IN',
            'OrdKy'             => null,
            'StkKy'             => null,
            'OrdTypKy'          => null,
            'CounterID'         => 1,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        
        $stock = DB::table('stock_in_hand')
            ->where('RefNo', 'TEST-STK-001')
            ->first();
    }

    echo "Using Unit Item: {$unitItem->ItmNm} ({$unitItem->ItmKy})\n";
    echo "Using Bundle Item: {$bundleItem->ItmNm} ({$bundleItem->ItmKy})\n";
    echo "Using Stock TableKy: {$stock->TableKy}\n";

    DB::transaction(function () use ($unitItem, $bundleItem, $stock, $companyCode, $sectionCode) {
        // Create reverse conversion
        $conversion = StockConversion::create([
            'company_code'      => $companyCode,
            'section_code'      => $sectionCode,
            'item_id'           => $unitItem->ItmKy,
            'to_item_id'        => $bundleItem->ItmKy,
            'item_code'         => $unitItem->ItemCode,
            'item_name'         => $unitItem->ItmNm,
            'to_item_code'      => $bundleItem->ItemCode,
            'to_item_name'      => $bundleItem->ItmNm,
            'stock_id'          => $stock->TableKy,
            'input_quantity'    => 10,
            'output_quantity'   => 1, // 10 units -> 1 bundle
            'conversion_factor' => 0.1,
            'reverse'           => true,
            'conversion_date'   => now(),
        ]);

        echo "Created conversion ID: {$conversion->id} (Ref: {$conversion->conversion_number})\n";

        // Execute it
        $conversion->executeConversion('BATCH-TEST-BUNDLE');
        
        // Verify ledger entries
        $out = DB::table('stock_in_hand')->where('RefNo', 'RCNV-OUT-' . $conversion->id)->first();
        $in = DB::table('stock_in_hand')->where('RefNo', 'RCNV-IN-' . $conversion->id)->first();

        if ($out && $in) {
            echo "SUCCESS: Ledger entries found!\n";
            echo "OUT: Item {$out->ItemKy} | Qty: {$out->Qty} (Expected: -10)\n";
            echo "IN:  Item {$in->ItemKy} | Qty: {$in->Qty} | Batch: {$in->batch_no} (Expected: +1)\n";
        } else {
            echo "FAILED: Missing ledger entries.\n";
        }
        
        // Rollback so we don't pollute the db
        DB::rollBack();
        echo "\nRolled back test data successfully.\n";
    });

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
