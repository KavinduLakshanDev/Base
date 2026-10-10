<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$users = DB::table('users')
    ->select('id', 'first_name', 'last_name', 'company_code', 'section_code', 'role_id', 'is_active')
    ->orderBy('id')
    ->get();

echo "=== ALL USERS ===\n\n";
foreach ($users as $user) {
    echo sprintf(
        "ID: %d | Name: %s %s | Company: %s | Section: %s | Role: %d | Active: %s\n",
        $user->id,
        $user->first_name,
        $user->last_name,
        $user->company_code ?? 'NULL',
        $user->section_code ?? 'NULL',
        $user->role_id,
        $user->is_active ? 'Yes' : 'No'
    );
}

echo "\n=== SECTIONS ===\n\n";
$sections = DB::table('sections')
    ->select('id', 'section_code', 'name', 'company_code')
    ->orderBy('company_code')
    ->orderBy('section_code')
    ->get();

foreach ($sections as $section) {
    echo sprintf(
        "Code: %s | Name: %s | Company: %s\n",
        $section->section_code,
        $section->name,
        $section->company_code
    );
}

echo "\n=== COMPANY ADMINS (role_id = 2) ===\n\n";
$companyAdmins = DB::table('users')
    ->where('role_id', 2)
    ->select('id', 'first_name', 'company_code', 'section_code')
    ->get();

foreach ($companyAdmins as $admin) {
    echo sprintf(
        "ID: %d | Name: %s | Company: %s | Section: %s\n",
        $admin->id,
        $admin->first_name,
        $admin->company_code ?? 'NULL',
        $admin->section_code ?? 'NULL'
    );
}
