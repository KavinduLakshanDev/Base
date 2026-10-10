<?php
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Sales Representative Role - Permission Details:\n";
echo str_repeat("=", 80) . "\n\n";

$salesRepRole = App\Models\Role::where('slug', 'sales_rep')->first();

if ($salesRepRole) {
    echo "Role: " . $salesRepRole->name . "\n";
    echo "Slug: " . $salesRepRole->slug . "\n";
    echo "Description: " . $salesRepRole->description . "\n";
    echo "Level: " . $salesRepRole->level . "\n";
    echo "\nTotal Permissions: " . $salesRepRole->permissions->count() . "\n\n";
    
    echo "All Permissions:\n";
    echo str_repeat("-", 80) . "\n";
    foreach ($salesRepRole->permissions->sortBy('name') as $index => $permission) {
        echo ($index + 1) . ". " . $permission->name . "\n";
    }
    
    // Check specifically for cross-company transfer permission
    $hasCrossCompany = $salesRepRole->permissions->contains('name', 'stock.cross_company_transfer');
    
    echo "\n" . str_repeat("=", 80) . "\n";
    echo "✓ Cross-Company Transfer Permission: " . ($hasCrossCompany ? 'GRANTED' : 'NOT FOUND') . "\n";
    
} else {
    echo "Sales Representative role not found!\n";
}
