<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "=== User Details ===" . PHP_EOL;

echo PHP_EOL . "User ID 1:" . PHP_EOL;
$user1 = User::find(1);
if ($user1) {
    echo "  Username: " . ($user1->username ?: 'N/A') . PHP_EOL;
    echo "  Name: " . trim(($user1->first_name ?? '') . ' ' . ($user1->last_name ?? '')) . PHP_EOL;
    echo "  Company: {$user1->company_code}" . PHP_EOL;
    echo "  Section: {$user1->section_code}" . PHP_EOL;
    echo "  Role ID: {$user1->role_id}" . PHP_EOL;
} else {
    echo "  Not found" . PHP_EOL;
}

echo PHP_EOL . "User ID 5 (who has the opening balance):" . PHP_EOL;
$user5 = User::find(5);
if ($user5) {
    echo "  Username: " . ($user5->username ?: 'N/A') . PHP_EOL;
    echo "  Name: " . trim(($user5->first_name ?? '') . ' ' . ($user5->last_name ?? '')) . PHP_EOL;
    echo "  Company: {$user5->company_code}" . PHP_EOL;
    echo "  Section: {$user5->section_code}" . PHP_EOL;
    echo "  Role ID: {$user5->role_id}" . PHP_EOL;
} else {
    echo "  Not found" . PHP_EOL;
}

// Check all users in VIS-SEC-002 section
echo PHP_EOL . "All users in section VIS-SEC-002:" . PHP_EOL;
$sectionUsers = User::where('section_code', 'VIS-SEC-002')
    ->where('is_active', true)
    ->get();

foreach ($sectionUsers as $u) {
    $name = trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? ''));
    echo "  - ID: {$u->id}, Username: " . ($u->username ?: 'N/A') . ", Name: {$name}, Role: {$u->role_id}" . PHP_EOL;
}

// Check the opening balance record details
echo PHP_EOL . "Opening Balance Record for 2026-03-06:" . PHP_EOL;
$balance = DB::table('day_opening_balances')
    ->where('balance_date', '2026-03-06')
    ->first();

if ($balance) {
    echo "  ID: {$balance->id}" . PHP_EOL;
    echo "  User ID: {$balance->user_id}" . PHP_EOL;
    echo "  Balance: Rs. {$balance->opening_balance}" . PHP_EOL;
    echo "  Company: {$balance->company_code}" . PHP_EOL;
    echo "  Section: {$balance->section_code}" . PHP_EOL;
    echo "  Created at: {$balance->created_at}" . PHP_EOL;
    echo "  Created by: " . ($balance->created_by ?? 'N/A') . PHP_EOL;
}

echo PHP_EOL . "=== Analysis Complete ===" . PHP_EOL;
