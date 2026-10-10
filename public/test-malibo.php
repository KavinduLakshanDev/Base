<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Product;

echo "<!DOCTYPE html>";
echo "<html><head><title>Malibo Products Test</title></head><body>";
echo "<h1>Malibo Products - Backend Test</h1>";

echo "<h2>Products shared with Malibo:</h2>";

$products = Product::availableInBusinessUnit('malibo')->get();

if ($products->count() > 0) {
    echo "<p style='color: green;'><strong>✓ Found {$products->count()} product(s)</strong></p>";
    echo "<table border='1' cellpadding='10'>";
    echo "<tr><th>ID</th><th>Code</th><th>Name</th><th>Company</th><th>Business Units</th></tr>";
    foreach ($products as $product) {
        echo "<tr>";
        echo "<td>{$product->ItmKy}</td>";
        echo "<td>{$product->ItemCode}</td>";
        echo "<td>{$product->ItmNm}</td>";
        echo "<td>{$product->company_code}</td>";
        echo "<td>" . json_encode($product->available_business_units) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    echo "<hr>";
    echo "<h3 style='color: green;'>✓ Backend is working correctly!</h3>";
    echo "<p>Products should appear at: <a href='/malibo/products'><strong>/malibo/products</strong></a></p>";
    echo "<p>If you don't see products there, please:</p>";
    echo "<ol>";
    echo "<li>Clear your browser cache (Ctrl+Shift+Delete)</li>";
    echo "<li>Make sure you're logged in as a user with Malibo access</li>";
    echo "<li>Check browser console for JavaScript errors (F12)</li>";
    echo "</ol>";
} else {
    echo "<p style='color: red;'><strong>✗ No products found!</strong></p>";
    echo "<p>Please ensure a product has 'malibo' in available_business_units column.</p>";
}

echo "</body></html>";
