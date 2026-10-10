<?php
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo str_repeat("=", 80) . "\n";
echo "FINAL USER SETUP VERIFICATION\n";
echo str_repeat("=", 80) . "\n\n";

// Company Admins
echo "COMPANY ADMINISTRATORS:\n";
echo str_repeat("-", 80) . "\n";
$admins = App\Models\User::whereIn('email', ['vismass@example.com', 'malibo@example.com'])->get();
foreach ($admins as $admin) {
    echo "✓ {$admin->email}\n";
    echo "  Name: {$admin->first_name} {$admin->last_name}\n";
    echo "  Company: {$admin->company_code}\n";
    echo "  Section: " . ($admin->section_code ?? 'None') . "\n";
    echo "  Role: " . ($admin->role ? $admin->role->name : 'N/A') . "\n";
    echo "  Has Cross-Company Permission: " . ($admin->hasPermission('stock.cross_company_transfer') ? 'YES (Admin Access)' : 'NO') . "\n";
    echo str_repeat("-", 80) . "\n";
}

// Sales Rep
echo "\nSALES REPRESENTATIVE:\n";
echo str_repeat("-", 80) . "\n";
$salesRep = App\Models\User::where('email', 'salesrep.malibo@example.com')->first();
if ($salesRep) {
    echo "✓ {$salesRep->email}\n";
    echo "  Name: {$salesRep->first_name} {$salesRep->last_name}\n";
    echo "  Company: {$salesRep->company_code}\n";
    echo "  Section: {$salesRep->section_code}\n";
    echo "  Role: " . ($salesRep->role ? $salesRep->role->name : 'N/A') . "\n";
    echo "  Has Cross-Company Permission: " . ($salesRep->hasPermission('stock.cross_company_transfer') ? 'YES ✓' : 'NO ✗') . "\n";
    
    if ($salesRep->role) {
        echo "  Total Permissions: " . $salesRep->role->permissions->count() . "\n";
    }
} else {
    echo "✗ Sales Rep not found!\n";
}
echo str_repeat("-", 80) . "\n";

// Section Users Summary
echo "\nSECTION USERS SUMMARY:\n";
echo str_repeat("-", 80) . "\n";

$sectionUsers = App\Models\User::where('user_type', 'section_user')
    ->whereNotIn('email', ['salesrep.malibo@example.com'])
    ->orderBy('company_code')
    ->orderBy('section_code')
    ->get();

$grouped = $sectionUsers->groupBy('company_code');

foreach ($grouped as $companyCode => $users) {
    echo "\n{$companyCode}:\n";
    foreach ($users as $user) {
        echo "  • {$user->email} - " . ($user->role ? $user->role->name : 'N/A') . " ({$user->section_code})\n";
    }
}

echo "\n" . str_repeat("=", 80) . "\n";
echo "Total Users: " . App\Models\User::count() . "\n";
echo str_repeat("=", 80) . "\n";
