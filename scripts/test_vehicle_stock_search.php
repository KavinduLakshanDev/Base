<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Section;
use App\Models\Product;
use App\Models\StockInHand;

echo "=== Testing Vehicle Stock Product Search ===\n\n";

// Get a user (any user with company_code)
$user = User::whereNotNull('company_code')->first();
if (!$user) {
    echo "No user with company_code found\n";
    exit;
}

echo "User: {$user->name} (Company: {$user->company_code})\n\n";

// Get sections for this company
$sections = Section::where('company_code', $user->company_code)
    ->orderByRaw('is_main_stock DESC, name ASC')
    ->get(['id', 'section_code', 'name']);

echo "Sections for company {$user->company_code}:\n";
foreach ($sections as $section) {
    echo "  - ID: {$section->id}, Code: {$section->section_code}, Name: {$section->name}\n";
}

if ($sections->isEmpty()) {
    echo "\nNo sections found for this company!\n";
    exit;
}

$firstSection = $sections->first();
echo "\nUsing section: {$firstSection->name} (ID: {$firstSection->id}, Code: {$firstSection->section_code})\n\n";

// Test 1: Check if there are products for this company
echo "=== Test 1: Products for company ===\n";
$products = Product::where('company_code', $user->company_code)
    ->where('fInAct', false)
    ->limit(5)
    ->get(['ItmKy', 'ItmNm', 'ItemCode']);

echo "Found " . $products->count() . " products\n";
foreach ($products as $prod) {
    echo "  - {$prod->ItmNm} (Code: {$prod->ItemCode}, ID: {$prod->ItmKy})\n";
}

if ($products->isEmpty()) {
    echo "\nNo products found for this company!\n";
    exit;
}

// Test 2: Check stock in hand for the first section
echo "\n=== Test 2: Stock in hand for section {$firstSection->section_code} ===\n";
$stockItems = StockInHand::where('company_code', $user->company_code)
    ->where('section_code', $firstSection->section_code)
    ->select('ItemKy', \Illuminate\Support\Facades\DB::raw('SUM(Qty + COALESCE(FreeQty, 0)) as total'))
    ->groupBy('ItemKy')
    ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0')
    ->limit(5)
    ->get();

echo "Found " . $stockItems->count() . " items with stock\n";
foreach ($stockItems as $item) {
    $product = Product::find($item->ItemKy);
    if ($product) {
        echo "  - {$product->ItmNm} (ID: {$item->ItemKy}, Qty: {$item->total})\n";
    }
}

if ($stockItems->isEmpty()) {
    echo "\nNo stock found in section {$firstSection->section_code}!\n";
    echo "This is why product search returns empty results.\n\n";
    
    // Check other sections
    echo "Checking other sections for stock...\n";
    foreach ($sections as $sec) {
        $count = StockInHand::where('company_code', $user->company_code)
            ->where('section_code', $sec->section_code)
            ->selectRaw('COUNT(DISTINCT ItemKy) as count')
            ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0')
            ->value('count');
        echo "  - {$sec->name} ({$sec->section_code}): {$count} items\n";
    }
}

// Test 3: Simulate the unified search query
echo "\n=== Test 3: Simulate unified search (searching 'a') ===\n";
$term = 'a';
$query = Product::where('company_code', $user->company_code)
    ->where('fInAct', false)
    ->where(function($q) use ($term) {
        $q->where('ItmNm', 'like', '%' . $term . '%')
          ->orWhere('ItemCode', 'like', '%' . $term . '%');
    })
    ->whereIn('ItmKy', function($sub) use ($firstSection, $user) {
        $sub->select('ItemKy')
            ->from('stock_in_hand')
            ->where('section_code', $firstSection->section_code)
            ->where('company_code', $user->company_code)
            ->groupBy('ItemKy')
            ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0');
    })
    ->limit(10)
    ->get(['ItmKy', 'ItmNm', 'ItemCode']);

echo "Found " . $query->count() . " products matching search\n";
foreach ($query as $prod) {
    echo "  - {$prod->ItmNm} (Code: {$prod->ItemCode})\n";
}

echo "\n=== Debug Complete ===\n";
