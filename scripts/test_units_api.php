<?php

// Test script to verify units API
// Run with: php test_units_api.php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Testing Units API\n";
echo "================\n\n";

// Get a user (assuming VIS001 company)
$user = \App\Models\User::where('company_code', 'VIS001')->first();

if (!$user) {
    echo "No user found with company_code VIS001\n";
    exit(1);
}

echo "User: {$user->name} (Company: {$user->company_code})\n\n";

// Test the query directly  
$units = \Illuminate\Support\Facades\DB::table('code_masters')
    ->where('conkey', 'UNT')
    ->where('is_active', true)
    ->whereNull('deleted_at')
    ->where('company_code', $user->company_code)
    ->select('id', 'cname as name', 'catkey')
    ->orderBy('cname')
    ->get();

echo "Units found: " . $units->count() . "\n\n";

foreach ($units as $unit) {
    echo "Unit ID: {$unit->id}\n";
    echo "Name: {$unit->name}\n";
    echo "Catkey: {$unit->catkey}\n";
    echo "---\n";
}

echo "\nJSON Response:\n";
echo json_encode($units, JSON_PRETTY_PRINT);
echo "\n";
