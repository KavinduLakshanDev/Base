<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\User;

echo "=== Testing Day Opening Balance Query ===" . PHP_EOL;

$user = User::find(1);
if (!$user) {
    echo "User ID 1 not found!" . PHP_EOL;
    exit(1);
}

echo "User: {$user->username} (ID: {$user->id})" . PHP_EOL;
echo "Company: {$user->company_code}" . PHP_EOL;
echo "Section: {$user->section_code}" . PHP_EOL;

$date = '2026-03-06';
$companyCode = $user->company_code;
$sectionCode = $user->section_code;

echo PHP_EOL . "Testing query with correct column (user_id)..." . PHP_EOL;

try {
    $openingBalance = DB::table('day_opening_balances')
        ->where('user_id', $user->id)
        ->where('balance_date', $date)
        ->where('company_code', $companyCode)
        ->where('section_code', $sectionCode)
        ->value('opening_balance');

    echo "✓ Query executed successfully!" . PHP_EOL;
    echo "Opening Balance: " . ($openingBalance ?? '0.00') . PHP_EOL;
    
    if ($openingBalance === null) {
        echo PHP_EOL . "ℹ Note: No opening balance record found for today." . PHP_EOL;
        echo "  This is normal if you haven't created one yet." . PHP_EOL;
        echo "  You can create one in the Day Opening Balance form." . PHP_EOL;
    }
    
} catch (\Exception $e) {
    echo "✗ Query failed: " . $e->getMessage() . PHP_EOL;
    exit(1);
}

echo PHP_EOL . "=== Test Complete ===" . PHP_EOL;
