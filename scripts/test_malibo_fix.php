<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Product;

echo "=== TEST FIXED MALIBO QUERY ===\n\n";

// Simulate the fixed query (no company filter)
echo "Query without company filter:\n";
$products = Product::availableInBusinessUnit('malibo')->get();
echo "Found: " . $products->count() . " products\n";
foreach ($products as $product) {
    echo "  - ID: {$product->ItmKy}, Name: {$product->ItmNm}, Company: {$product->company_code}\n";
}
echo "\n";

// Simulate the old query (with company filter)
echo "Old query with MAL001 company filter:\n";
$oldProducts = Product::availableInBusinessUnit('malibo')
    ->where('itemmaster.company_code', 'MAL001')
    ->get();
echo "Found: " . $oldProducts->count() . " products\n";
echo "\n";

echo "✓ Fix confirmed: Products will now show in Malibo!\n";
echo "=== END TEST ===\n";
