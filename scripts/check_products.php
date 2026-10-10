<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Product;
use App\Models\Company;

echo "=== Checking Products Database ===\n\n";

// Get all companies
$companies = Company::all();
echo "Companies:\n";
foreach ($companies as $company) {
    echo "  - {$company->company_name} ({$company->company_code})\n";
}

echo "\n=== Product Count by Company ===\n";
$productCounts = Product::selectRaw('company_code, COUNT(*) as count')
    ->groupBy('company_code')
    ->get();

if ($productCounts->isEmpty()) {
    echo "NO PRODUCTS FOUND IN DATABASE!\n\n";
    echo "This is why product search is not working.\n";
    echo "You need to add products to the itemmaster table.\n";
} else {
    foreach ($productCounts as $count) {
        echo "  - Company: {$count->company_code}, Products: {$count->count}\n";
    }
    
    echo "\n=== Sample Products ===\n";
    $sampleProducts = Product::limit(10)->get(['ItmKy', 'ItmNm', 'ItemCode', 'company_code', 'fInAct']);
    foreach ($sampleProducts as $prod) {
        $status = $prod->fInAct ? 'INACTIVE' : 'ACTIVE';
        echo "  - {$prod->ItmNm} (Code: {$prod->ItemCode}, Company: {$prod->company_code}, Status: {$status})\n";
    }
}

echo "\n=== Total Products ===\n";
$total = Product::count();
$active = Product::where('fInAct', false)->count();
echo "Total: {$total}\n";
echo "Active: {$active}\n";
