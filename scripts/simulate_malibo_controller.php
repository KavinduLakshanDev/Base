<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Product;
use Illuminate\Support\Facades\Route;

echo "=== SIMULATE MALIBO CONTROLLER EXECUTION ===\n\n";

// Simulate the controller logic
$route = Route::getRoutes()->getByName('malibo.products.index');

echo "1. Route Detection:\n";
if ($route) {
    echo "  ✓ Route found\n";
    echo "  Route Name: " . $route->getName() . "\n";
    
    $routeName = $route->getName();
    $isMaliboRoute = str_contains($routeName, 'malibo.');
    echo "  Is Malibo Route: " . ($isMaliboRoute ? 'YES ✓' : 'NO ✗') . "\n";
} else {
    echo "  ✗ Route NOT found\n";
}
echo "\n";

echo "2. Query Execution (Malibo Filter):\n";
$query = Product::query();
$query->select('itemmaster.*')->selectRaw('NULL as branch_reorder_level');

// Apply Malibo filter (as per fixed controller)
$query->availableInBusinessUnit('malibo');
// NO company filter

$products = $query->get();
echo "  Products found: " . $products->count() . "\n";
foreach ($products as $product) {
    echo "    - ID: {$product->ItmKy}\n";
    echo "      Name: {$product->ItmNm}\n";
    echo "      Company: {$product->company_code}\n";
    echo "      Business Units: " . json_encode($product->available_business_units) . "\n";
}
echo "\n";

echo "3. Total Count Query:\n";
$totalQuery = Product::query();
$totalQuery->availableInBusinessUnit('malibo');
$totalCount = $totalQuery->count();
echo "  Total count: {$totalCount}\n";
echo "\n";

echo "4. Testing if product would appear in paginated results:\n";
$paginatedQuery = Product::query();
$paginatedQuery->select('itemmaster.*')
    ->selectRaw('NULL as branch_reorder_level')
    ->availableInBusinessUnit('malibo');
    
$items = $paginatedQuery->with(['brand:id,name'])->paginate(10);
echo "  Paginated items: " . $items->count() . " (of {$items->total()} total)\n";
foreach ($items as $item) {
    echo "    - {$item->ItmNm} (ID: {$item->ItmKy})\n";
}
echo "\n";

if ($products->count() > 0) {
    echo "✓ RESULT: Products SHOULD appear in /malibo/products\n";
} else {
    echo "✗ RESULT: Products WILL NOT appear in /malibo/products\n";
    echo "  Check if products have 'malibo' in available_business_units\n";
}

echo "\n=== END SIMULATION ===\n";
