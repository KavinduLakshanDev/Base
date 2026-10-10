<?php
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Sales Representative Role Permissions:\n";
echo str_repeat("=", 80) . "\n\n";

$salesRepRole = App\Models\Role::where('name', 'sales_rep')->first();

if ($salesRepRole) {
    echo "Role: " . $salesRepRole->name . "\n";
    echo "Description: " . $salesRepRole->description . "\n";
    echo "\nPermissions Count: " . $salesRepRole->permissions->count() . "\n\n";
    
    echo "Permissions:\n";
    foreach ($salesRepRole->permissions->sortBy('name') as $permission) {
        echo "  ✓ " . $permission->name . "\n";
    }
    
    // Check for cross-company transfer permission
    $hasCrossCompany = $salesRepRole->permissions->contains('name', 'stock.cross_company_transfer');
    echo "\n" . str_repeat("=", 80) . "\n";
    echo "Has Cross-Company Transfer Permission: " . ($hasCrossCompany ? 'YES ✓' : 'NO ✗') . "\n";
} else {
    echo "Sales Representative role not found!\n";
}
