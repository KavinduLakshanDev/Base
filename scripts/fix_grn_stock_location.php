<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Purchase;
use App\Models\PurchaseDet;

echo "=== Fixing GRN VIS001-VIS-SEC-003-000005 ===\n\n";

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

echo "Found Purchase Key: {$purchase->PurchaseKey}\n\n";

// Note: stock_location_type only exists in PurchaseDet, not Purchase table
// Update all detail items to main_stock
echo "Updating Purchase Details stock_location_type to 'main_stock'...\n";
foreach ($purchase->details as $detail) {
    echo "  - Updating Detail Key {$detail->DetKy}: ";
    $detail->stock_location_type = 'main_stock';
    $detail->save();
    echo "✓\n";
}

echo "\n=== Verification ===\n";
$purchase->refresh();
foreach ($purchase->details as $index => $detail) {
    echo "Item #" . ($index + 1) . " stock_location_type: {$detail->stock_location_type}, Free: {$detail->Free}\n";
}

$allPrintingSection = $purchase->details->every(function($detail) {
    return $detail->stock_location_type === 'printing_section';
});

echo "\nisPrinterGrn: " . ($allPrintingSection && $purchase->details->count() > 0 ? 'TRUE' : 'FALSE') . "\n";
echo "Free column will now: " . ($allPrintingSection ? 'HIDDEN ❌' : 'VISIBLE ✓') . "\n";

echo "\n✅ Fix completed! Refresh your browser to see the Free column.\n";
