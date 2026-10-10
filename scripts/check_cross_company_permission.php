<?php
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Cross-Company Transfer Permission Details:\n";
echo str_repeat("=", 80) . "\n\n";

// Search for the permission
$permissions = App\Models\Permission::where('name', 'like', '%cross%')
    ->orWhere('name', 'like', '%transfer%')
    ->get();

if ($permissions->count() > 0) {
    foreach ($permissions as $perm) {
        echo "ID: " . $perm->id . "\n";
        echo "Name: " . $perm->name . "\n";
        echo "Display Name: " . ($perm->display_name ?? 'N/A') . "\n";
        echo "Category: " . ($perm->category ?? 'N/A') . "\n";
        echo "Assigned to Roles: " . $perm->roles->pluck('name')->implode(', ') . "\n";
        echo str_repeat("-", 80) . "\n";
    }
} else {
    echo "No cross-company or transfer permissions found!\n";
}

// Also check the exact permission name
$exactPerm = App\Models\Permission::where('name', 'stock.cross_company_transfer')->first();
if ($exactPerm) {
    echo "\nEXACT MATCH FOUND:\n";
    echo "Name: " . $exactPerm->name . "\n";
    echo "Display Name: " . $exactPerm->display_name . "\n";
    echo "In Sales Rep Role: " . ($exactPerm->roles->contains('slug', 'sales_rep') ? 'YES' : 'NO') . "\n";
}
