<?php
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo str_repeat("=", 80) . "\n";
echo "CROSS-COMPANY STOCK TRANSFER - IMPLEMENTATION VERIFICATION\n";
echo str_repeat("=", 80) . "\n\n";

// 1. Check Permission
echo "1. PERMISSION CHECK:\n";
echo str_repeat("-", 80) . "\n";
$permission = App\Models\Permission::where('slug', 'stock.cross_company_transfer')->first();
if ($permission) {
    echo "✓ Permission Found:\n";
    echo "  - Name: {$permission->name}\n";
    echo "  - Slug: {$permission->slug}\n";
    echo "  - Description: {$permission->description}\n";
    echo "  - Assigned to " . $permission->roles->count() . " role(s)\n";
} else {
    echo "✗ Permission NOT FOUND!\n";
}
echo "\n";

// 2. Check Sales Rep Role
echo "2. SALES REPRESENTATIVE ROLE:\n";
echo str_repeat("-", 80) . "\n";
$salesRepRole = App\Models\Role::where('slug', 'sales_rep')->first();
if ($salesRepRole) {
    echo "✓ Role Found:\n";
    echo "  - Name: {$salesRepRole->name}\n";
    echo "  - Description: {$salesRepRole->description}\n";
    echo "  - Total Permissions: " . $salesRepRole->permissions->count() . "\n";
    
    $hasPermission = $salesRepRole->permissions->contains('slug', 'stock.cross_company_transfer');
    echo "  - Has Cross-Company Permission: " . ($hasPermission ? "YES ✓" : "NO ✗") . "\n";
} else {
    echo "✗ Sales Rep Role NOT FOUND!\n";
}
echo "\n";

// 3. Check Company Admins
echo "3. COMPANY ADMINISTRATORS:\n";
echo str_repeat("-", 80) . "\n";
$vismassAdmin = App\Models\User::where('email', 'vismass@example.com')->first();
$maliboAdmin = App\Models\User::where('email', 'malibo@example.com')->first();

echo "VISMASS Admin:\n";
if ($vismassAdmin) {
    echo "  ✓ Email: {$vismassAdmin->email}\n";
    echo "  ✓ Company: {$vismassAdmin->company_code}\n";
    echo "  ✓ Section: " . ($vismassAdmin->section_code ?? 'Not Assigned') . "\n";
    echo "  ✓ Role: " . ($vismassAdmin->role ? $vismassAdmin->role->name : 'No Role') . "\n";
} else {
    echo "  ✗ VISMASS Admin not found\n";
}

echo "\nMALIBO Admin:\n";
if ($maliboAdmin) {
    echo "  ✓ Email: {$maliboAdmin->email}\n";
    echo "  ✓ Company: {$maliboAdmin->company_code}\n";
    echo "  ✓ Section: " . ($maliboAdmin->section_code ?? 'Not Assigned') . "\n";
    echo "  ✓ Role: " . ($maliboAdmin->role ? $maliboAdmin->role->name : 'No Role') . "\n";
} else {
    echo "  ✗ MALIBO Admin not found\n";
}
echo "\n";

// 4. Check Database Columns
echo "4. DATABASE SCHEMA:\n";
echo str_repeat("-", 80) . "\n";

// Check stock_in_hand for owner_company_code
$sampleStock = DB::table('stock_in_hand')->first();
if ($sampleStock && property_exists($sampleStock, 'owner_company_code')) {
    echo "✓ stock_in_hand.owner_company_code column exists\n";
} else {
    echo "✗ stock_in_hand.owner_company_code column NOT FOUND\n";
}

// Check stock_transfers for item_code and item_name
$sampleTransfer = DB::table('stock_transfers')->first();
if ($sampleTransfer) {
    if (property_exists($sampleTransfer, 'item_code')) {
        echo "✓ stock_transfers.item_code column exists\n";
    } else {
        echo "✗ stock_transfers.item_code column NOT FOUND\n";
    }
    
    if (property_exists($sampleTransfer, 'item_name')) {
        echo "✓ stock_transfers.item_name column exists\n";
    } else {
        echo "✗ stock_transfers.item_name column NOT FOUND\n";
    }
} else {
    echo "⚠ No stock transfers found to verify columns\n";
}
echo "\n";

// 5. Summary
echo "5. IMPLEMENTATION SUMMARY:\n";
echo str_repeat("-", 80) . "\n";

$checks = [
    'Permission exists' => isset($permission) && $permission !== null,
    'Sales Rep role exists' => isset($salesRepRole) && $salesRepRole !== null,
    'Sales Rep has permission' => isset($hasPermission) && $hasPermission === true,
    'VISMASS admin exists' => isset($vismassAdmin) && $vismassAdmin !== null,
    'VISMASS admin has section' => isset($vismassAdmin) && $vismassAdmin->section_code !== null,
    'MALIBO admin exists' => isset($maliboAdmin) && $maliboAdmin !== null,
    'MALIBO admin has section' => isset($maliboAdmin) && $maliboAdmin->section_code !== null,
];

$allPassed = true;
foreach ($checks as $check => $passed) {
    echo ($passed ? "✓" : "✗") . " {$check}\n";
    if (!$passed) $allPassed = false;
}

echo "\n" . str_repeat("=", 80) . "\n";
if ($allPassed) {
    echo "✓✓✓ ALL CHECKS PASSED - IMPLEMENTATION COMPLETE ✓✓✓\n";
} else {
    echo "✗✗✗ SOME CHECKS FAILED - REVIEW REQUIRED ✗✗✗\n";
}
echo str_repeat("=", 80) . "\n";
