<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Checking products shared with Malibo:\n\n";

// Get products with malibo in available_business_units
$products = DB::table('itemmaster')
    ->whereRaw("JSON_CONTAINS(available_business_units, '\"malibo\"')")
    ->select('ItmKy', 'ItemCode', 'ItmNm', 'available_business_units')
    ->get();

echo "Products shared with Malibo: " . $products->count() . "\n\n";

foreach ($products as $product) {
    echo "ID: {$product->ItmKy}\n";
    echo "Code: {$product->ItemCode}\n";
    echo "Name: {$product->ItmNm}\n";
    echo "Business Units: {$product->available_business_units}\n";
    echo "---\n";
}

// Check the specific product mentioned
echo "\nChecking 'Test-product' specifically:\n";
$testProduct = DB::table('itemmaster')
    ->where('ItmNm', 'LIKE', '%Test-product%')
    ->orWhere('ItmNm', 'LIKE', '%Test%')
    ->select('ItmKy', 'ItemCode', 'ItmNm', 'available_business_units')
    ->first();

if ($testProduct) {
    echo "Found product:\n";
    echo "  ID: {$testProduct->ItmKy}\n";
    echo "  Name: {$testProduct->ItmNm}\n";
    echo "  Business Units: {$testProduct->available_business_units}\n";
} else {
    echo "Product not found\n";
}
