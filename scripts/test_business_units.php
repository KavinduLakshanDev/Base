<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing available_business_units column:\n\n";

// Check if column exists
try {
    $columns = DB::select('SHOW COLUMNS FROM itemmaster WHERE Field = ?', ['available_business_units']);
    
    if (count($columns) > 0) {
        echo "✓ Column 'available_business_units' exists\n";
        echo "  Type: " . $columns[0]->Type . "\n";
        echo "  Default: " . ($columns[0]->Default ?? 'NULL') . "\n\n";
    } else {
        echo "✗ Column 'available_business_units' does NOT exist\n\n";
    }
} catch (\Exception $e) {
    echo "✗ Error checking column: " . $e->getMessage() . "\n\n";
}

// Check first product
try {
    $product = \App\Models\Product::first();
    
    if ($product) {
        echo "Sample product:\n";
        echo "  ID: " . $product->ItmKy . "\n";
        echo "  Name: " . $product->ItmNm . "\n";
        echo "  available_business_units: " . json_encode($product->available_business_units) . "\n";
    } else {
        echo "No products found in database\n";
    }
} catch (\Exception $e) {
    echo "✗ Error fetching product: " . $e->getMessage() . "\n";
}

echo "\nTest complete.\n";
