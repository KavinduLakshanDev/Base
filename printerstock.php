<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$batchOld = 'GRN-VIS-VIS-0061';
$batchNew = 'GRN-VIS-VIS-0067';
$purchaseKeyOld = 104;
$prefix = '912315C01292AC21';

// 1. Update StockInHand sales/wastage records
$stocks = \App\Models\StockInHand::where('batch_no', $batchOld)
    ->whereIn('TrnTyp', ['SAL', 'PWST-OUT'])
    ->get();

foreach ($stocks as $stock) {
    $newSerial = str_replace($prefix, '', $stock->serial_number);
    $stock->update([
        'batch_no' => $batchNew,
        'serial_number' => $newSerial
    ]);
}

// 2. Delete the old GRN StockInHand records (Qty 1)
\App\Models\StockInHand::where('batch_no', $batchOld)->delete();

// 3. Delete PurchaseDet records
\App\Models\PurchaseDet::where('PurchaseKey', $purchaseKeyOld)->delete();

// 4. Delete Purchase record
\App\Models\Purchase::where('PurchaseKey', $purchaseKeyOld)->delete();

echo "Successfully migrated transactions and deleted duplicate GRN.\n";
