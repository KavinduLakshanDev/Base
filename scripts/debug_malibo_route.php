<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Product;

echo "=== DEBUG MALIBO PRODUCTS ===\n\n";

// 1. Check database for products shared with malibo
echo "1. Products with 'malibo' in available_business_units:\n";
$products = Product::whereRaw("JSON_CONTAINS(available_business_units, '\"malibo\"')")->get();
echo "Found: " . $products->count() . " products\n";
foreach ($products as $product) {
    $units = $product->available_business_units; // Already cast to array
    echo "  - ID: {$product->ItmKy}, Name: {$product->ItmNm}, Units: " . json_encode($units) . "\n";
    echo "    Company: {$product->company_code}, Section: {$product->section_code}\n";
}
echo "\n";

// 2. Test the scope method
echo "2. Testing availableInBusinessUnit('malibo') scope:\n";
$scopedProducts = Product::availableInBusinessUnit('malibo')->get();
echo "Found: " . $scopedProducts->count() . " products\n";
foreach ($scopedProducts as $product) {
    echo "  - ID: {$product->ItmKy}, Name: {$product->ItmNm}\n";
}
echo "\n";

// 3. Check if available_business_units column exists and data type
echo "3. Column information:\n";
$connection = Product::getConnection();
$columns = $connection->select("SHOW COLUMNS FROM itemmaster WHERE Field = 'available_business_units'");
if (!empty($columns)) {
    foreach ($columns as $col) {
        echo "  Column: {$col->Field}\n";
        echo "  Type: {$col->Type}\n";
        echo "  Default: {$col->Default}\n";
    }
} else {
    echo "  ERROR: Column 'available_business_units' not found!\n";
}
echo "\n";

// 4. Raw SQL test
echo "4. Raw SQL test:\n";
$results = $connection->select("
    SELECT ItmKy, ItmNm, available_business_units, company_code 
    FROM itemmaster 
    WHERE JSON_CONTAINS(available_business_units, '\"malibo\"')
    LIMIT 5
");
echo "Found: " . count($results) . " products\n";
foreach ($results as $row) {
    echo "  - ID: {$row->ItmKy}, Name: {$row->ItmNm}, Units: {$row->available_business_units}\n";
}
echo "\n";

echo "=== END DEBUG ===\n";
