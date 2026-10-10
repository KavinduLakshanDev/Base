<?php
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "All Users Created:\n";
echo str_repeat("=", 80) . "\n\n";

$users = App\Models\User::orderBy('company_code')->orderBy('email')->get();

foreach ($users as $user) {
    echo "Email: " . $user->email . "\n";
    echo "Name: " . $user->first_name . " " . $user->last_name . "\n";
    echo "Company: " . $user->company_code . "\n";
    echo "Section: " . ($user->section_code ?? 'Not Assigned') . "\n";
    echo "User Type: " . ($user->user_type ?? 'Not Set') . "\n";
    echo "Role: " . ($user->role ? $user->role->name : 'No Role') . "\n";
    echo str_repeat("-", 80) . "\n";
}

echo "\nTotal Users: " . $users->count() . "\n";
