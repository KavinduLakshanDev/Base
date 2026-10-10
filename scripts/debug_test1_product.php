<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Product;
use App\Models\Company;

// Check product 83 (test 1)
$product = Product::find(83);
if (!$product) {
    echo "Product 83 NOT FOUND\n";
    exit;
}

echo "=== PRODUCT 83 (test 1) ===\n";
echo "Name: {$product->ItmNm}\n";
echo "Company Code: {$product->company_code}\n";
echo "Available Business Units: " . json_encode($product->available_business_units) . "\n";
echo "Cost Price (base): {$product->CosPri}\n";
echo "Retail Price (base): {$product->SlsPri}\n";
echo "\n";

// Check itemPriceDet for MAL001
echo "=== itemPriceDet Records for MAL001 ===\n";
$prices = $product->itemPriceDet()->where('company_code', 'MAL001')->get();
echo "Count: {$prices->count()}\n";
foreach ($prices as $price) {
    echo "  - CosPri: {$price->CosPri}, SlsPri: {$price->SlsPri}, WholePrice: {$price->WholePrice}\n";
}

echo "\n=== API Query Simulation ===\n";
$company = Company::find(1); // Assuming company_id 1 is MAL001
echo "Testing with company: {$company->company_code}\n";

if (str_starts_with(strtoupper($company->company_code), 'MAL')) {
    $businessUnit = 'malibo';
    echo "Business Unit: {$businessUnit}\n";
    
    // Simulate the exact query
    $query = Product::where('fInAct', false)
        ->where(function($q) use ($company, $businessUnit) {
            $q->where('company_code', $company->company_code)
              ->orWhereJsonContains('available_business_units', $businessUnit);
        });
    
    $result = $query->find(83);
    echo "Query Result: " . ($result ? "FOUND (ID: {$result->ItmKy})" : "NOT FOUND") . "\n";
}
