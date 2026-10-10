<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Purchase;
use App\Models\PurchaseDet;

echo "=== Testing Purchase Data ===\n\n";

// Find the specific purchase
$purchaseNo = 3; // GRN number 000003
$companyCode = 'VIS001';
$sectionCode = 'VIS-SEC-003';

echo "Looking for Purchase with:\n";
echo "- PurchaseNo: $purchaseNo\n";
echo "- Company: $companyCode\n";
echo "- Section: $sectionCode\n\n";

$purchase = Purchase::where('PurchaseNo', $purchaseNo)
    ->where('company_code', $companyCode)
    ->where('section_code', $sectionCode)
    ->first();

if (!$purchase) {
    echo "❌ Purchase not found!\n";
    
    // List all purchases to help debug
    echo "\nAll purchases in database:\n";
    $allPurchases = Purchase::select('PurchaseKey', 'PurchaseNo', 'company_code', 'section_code')->get();
    foreach ($allPurchases as $p) {
        echo "- PurchaseKey: {$p->PurchaseKey}, PurchaseNo: {$p->PurchaseNo}, Company: {$p->company_code}, Section: {$p->section_code}\n";
    }
    exit;
}

echo "✅ Purchase found!\n";
echo "PurchaseKey: {$purchase->PurchaseKey}\n";
echo "GRN No: {$purchase->company_code}-" . sprintf('%06d', $purchase->PurchaseNo) . "\n\n";

// Get purchase details
echo "=== Purchase Details (Items) ===\n\n";
$details = PurchaseDet::where('PurchaseKey', $purchase->PurchaseKey)->get();

echo "Total items: " . $details->count() . "\n\n";

foreach ($details as $index => $detail) {
    echo "--- Item #" . ($index + 1) . " ---\n";
    echo "DetailKey: {$detail->PerchaseDetKy}\n";
    echo "ItemKy (Product ID): {$detail->iTimKy}\n";
    echo "item_name field: " . ($detail->item_name ?? 'NULL') . "\n";
    echo "Qty: {$detail->Qty}\n";
    echo "Free (free_qty): " . ($detail->Free ?? 'NULL') . "\n";
    echo "CostPrice: {$detail->CostPrice}\n";
    echo "Brand: " . ($detail->brand ?? 'NULL') . "\n";
    echo "Model: " . ($detail->model ?? 'NULL') . "\n";
    echo "Serial Number: " . ($detail->serial_number ?? 'NULL') . "\n";
    
    // Check if product relationship exists
    if ($detail->product) {
        echo "Product relationship found:\n";
        echo "  - Product Code: {$detail->product->ItemCode}\n";
        echo "  - Product Name: {$detail->product->ItmNm}\n";
    } else {
        echo "Product relationship: NULL (product_id might be 0 or product deleted)\n";
    }
    
    echo "\n";
}

echo "\n=== Database Column Check ===\n\n";

// Check if columns exist in the table
$testDetail = $details->first();
if ($testDetail) {
    echo "Available attributes on PurchaseDet model:\n";
    $attributes = $testDetail->getAttributes();
    foreach ($attributes as $key => $value) {
        echo "- $key: " . (is_null($value) ? 'NULL' : (is_numeric($value) ? $value : substr($value, 0, 50))) . "\n";
    }
}

echo "\n=== Testing Controller Logic ===\n\n";

// Simulate what the controller does
$purchase->load(['details.product']);

echo "Mapped items (as controller would return):\n\n";
foreach ($purchase->details as $index => $detail) {
    // Original logic (problematic)
    $productNameOld = $detail->product ? ($detail->product->ItmNm ?? 'N/A') : ($detail->item_name ?? 'Consumable');
    
    // New logic (should work)
    $productNameNew = $detail->item_name;
    if (!$productNameNew && $detail->product) {
        $productNameNew = $detail->product->ItmNm ?? '';
    }
    if (!$productNameNew) {
        $productNameNew = 'Unknown Product';
    }
    
    echo "Item #" . ($index + 1) . ":\n";
    echo "  OLD logic product_name: $productNameOld\n";
    echo "  NEW logic product_name: $productNameNew\n";
    echo "  free_qty: " . ((float) ($detail->Free ?? 0)) . "\n";
    echo "\n";
}

echo "\n✅ Test completed!\n";
