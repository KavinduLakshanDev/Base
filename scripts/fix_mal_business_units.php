<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\\Contracts\\Console\\Kernel')->bootstrap();

use App\Models\Product;

$products = Product::where('company_code', 'MAL001')
    ->get();

echo "Updating " . $products->count() . " MAL001 products...\n";
$updated = 0;
foreach ($products as $p) {
    $units = $p->available_business_units ?? [];
    if (!in_array('malibo', $units)) {
        $units[] = 'malibo';
        $p->available_business_units = array_values(array_unique($units));
        $p->save();
        $updated++;
        echo " - Updated product ID {$p->ItmKy}: set available_business_units=" . json_encode($p->available_business_units) . "\n";
    }
}

echo "Done. Updated: {$updated}\n";
