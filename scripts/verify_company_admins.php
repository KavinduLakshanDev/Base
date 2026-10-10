<?php
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Company Admins Overview:\n";
echo str_repeat("=", 80) . "\n\n";

$companyAdmins = App\Models\User::where('user_type', 'company_admin')->get();

foreach ($companyAdmins as $admin) {
    echo "Email: " . $admin->email . "\n";
    echo "Name: " . $admin->first_name . " " . $admin->last_name . "\n";
    echo "Company: " . $admin->company_code . "\n";
    echo "Section: " . ($admin->section_code ?? 'Not Assigned') . "\n";
    echo "Role: " . ($admin->role ? $admin->role->name : 'No Role') . "\n";
    echo "Active: " . ($admin->is_active ? 'Yes' : 'No') . "\n";
    echo str_repeat("-", 80) . "\n";
}

echo "\nTotal Company Admins: " . $companyAdmins->count() . "\n";
