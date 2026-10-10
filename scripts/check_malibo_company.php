<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Product;
use Illuminate\Support\Facades\DB;

echo "=== MALIBO COMPANY CHECK ===\n\n";

// Get the shared product
$product = Product::where('ItmKy', 6)->first();
if ($product) {
    echo "Product Details:\n";
    echo "  ID: {$product->ItmKy}\n";
    echo "  Name: {$product->ItmNm}\n";
    echo "  Company Code: {$product->company_code}\n";
    echo "  Section Code: {$product->section_code}\n";
    echo "  Business Units: " . json_encode($product->available_business_units) . "\n";
    echo "\n";
}

// Check sections table to see Malibo sections
echo "Malibo Sections:\n";
$maliboSections = DB::table('sections')
    ->where('section_code', 'like', 'MAL%')
    ->get();
    
foreach ($maliboSections as $section) {
    echo "  - Section Code: {$section->section_code}\n";
    echo "    Section Name: {$section->name}\n";
    echo "    Company Code: {$section->company_code}\n";
    echo "\n";
}

// Check if there are users in Malibo sections
echo "Users in Malibo sections:\n";
$maliboUsers = DB::table('users')
    ->where('section_code', 'like', 'MAL%')
    ->select('id', 'name', 'company_code', 'section_code')
    ->get();
    
foreach ($maliboUsers as $user) {
    echo "  - User: {$user->name}\n";
    echo "    Company Code: {$user->company_code}\n";
    echo "    Section Code: {$user->section_code}\n";
    echo "\n";
}

// Test query with different company codes
echo "Testing query with company code filter:\n";
echo "1. With company_code = VIS001:\n";
$query1 = Product::availableInBusinessUnit('malibo')
    ->where('itemmaster.company_code', 'VIS001')
    ->count();
echo "   Found: {$query1} products\n\n";

echo "2. Without company code filter:\n";
$query2 = Product::availableInBusinessUnit('malibo')
    ->count();
echo "   Found: {$query2} products\n\n";

echo "=== END CHECK ===\n";
