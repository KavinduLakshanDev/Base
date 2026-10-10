<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Purchase;
use App\Models\PurchaseDet;

echo "=== Checking GRN VIS001-000005 ===\n\n";

// Find the purchase
$purchase = Purchase::where('company_code', 'VIS001')
    ->where('section_code', 'VIS-SEC-003')
    ->where('PurchaseNo', 5)
    ->with('details')
    ->first();

if (!$purchase) {
    echo "❌ Purchase not found!\n";
    exit;
}

echo "✓ Purchase found: {$purchase->company_code}-" . str_pad($purchase->PurchaseNo, 6, '0', STR_PAD_LEFT) . "\n";
echo "Purchase Key: {$purchase->PurchaseKey}\n\n";

echo "=== Purchase Details ===\n";
foreach ($purchase->details as $index => $detail) {
    echo "\nItem #" . ($index + 1) . ":\n";
    echo "  - Product Key: {$detail->ProdKey}\n";
    echo "  - Item Name: {$detail->item_name}\n";
    echo "  - Qty: {$detail->Qty}\n";
    echo "  - Free: {$detail->Free}\n";
    echo "  - Brand: " . ($detail->brand ?? 'NULL') . "\n";
    echo "  - Model: " . ($detail->model ?? 'NULL') . "\n";
    echo "  - Serial Number: " . ($detail->serial_number ?? 'NULL') . "\n";
}

echo "\n=== Analysis ===\n";
$allPrintingItems = $purchase->details->every(function($detail) {
    return !empty($detail->serial_number);
});

echo "All items printing items: " . ($allPrintingItems ? 'YES' : 'NO') . "\n";
echo "isPrinterGrn would be: " . ($allPrintingItems && $purchase->details->count() > 0 ? 'TRUE (Free column HIDDEN)' : 'FALSE (Free column VISIBLE)') . "\n";

if ($allPrintingItems) {
    echo "\n⚠️  PROBLEM FOUND: All items marked as printing_section, so Free column is hidden!\n";
    echo "This should be a Main Stock GRN if it has free quantities.\n";
}

echo "\n";
