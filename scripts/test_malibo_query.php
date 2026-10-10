<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing Malibo Product Query:\n\n";

// Simulate the malibo query
$query = \App\Models\Product::query()
    ->select('itemmaster.*')
    ->whereRaw("JSON_CONTAINS(available_business_units, '\"malibo\"')");

echo "SQL Query:\n";
echo $query->toSql() . "\n\n";

$products = $query->get();

echo "Results: " . $products->count() . " products\n\n";

foreach ($products as $product) {
    echo "ID: {$product->ItmKy}\n";
    echo "Code: {$product->ItemCode}\n";  
    echo "Name: {$product->ItmNm}\n";
    echo "Business Units: " . json_encode($product->available_business_units) . "\n";
    echo "---\n";
}
