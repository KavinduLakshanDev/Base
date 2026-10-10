<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\DayOpeningBalance;

echo "=== Checking Opening Balance Records ===" . PHP_EOL;

$user = User::find(1);
if (!$user) {
    echo "User not found!" . PHP_EOL;
    exit(1);
}

echo "User: {$user->username} (ID: {$user->id})" . PHP_EOL;
echo "Company: {$user->company_code}" . PHP_EOL;
echo "Section: {$user->section_code}" . PHP_EOL;

$date = '2026-03-06';
echo PHP_EOL . "Looking for opening balance on: {$date}" . PHP_EOL;

// Check with all filters
echo PHP_EOL . "Query 1: With all filters (user_id, balance_date, company_code, section_code)" . PHP_EOL;
$balance1 = DB::table('day_opening_balances')
    ->where('user_id', $user->id)
    ->where('balance_date', $date)
    ->where('company_code', $user->company_code)
    ->where('section_code', $user->section_code)
    ->first();

if ($balance1) {
    echo "✓ Found record:" . PHP_EOL;
    echo "  ID: {$balance1->id}" . PHP_EOL;
    echo "  Balance: Rs. {$balance1->opening_balance}" . PHP_EOL;
    echo "  Created: {$balance1->created_at}" . PHP_EOL;
} else {
    echo "✗ No record found" . PHP_EOL;
}

// Check with less filters
echo PHP_EOL . "Query 2: With user_id and date only" . PHP_EOL;
$balance2 = DB::table('day_opening_balances')
    ->where('user_id', $user->id)
    ->where('balance_date', $date)
    ->first();

if ($balance2) {
    echo "✓ Found record:" . PHP_EOL;
    echo "  ID: {$balance2->id}" . PHP_EOL;
    echo "  Balance: Rs. {$balance2->opening_balance}" . PHP_EOL;
    echo "  Company: {$balance2->company_code}" . PHP_EOL;
    echo "  Section: {$balance2->section_code}" . PHP_EOL;
} else {
    echo "✗ No record found" . PHP_EOL;
}

// Check all records for this user
echo PHP_EOL . "Query 3: All records for user {$user->id}" . PHP_EOL;
$allBalances = DB::table('day_opening_balances')
    ->where('user_id', $user->id)
    ->orderBy('balance_date', 'desc')
    ->limit(5)
    ->get();

if ($allBalances->count() > 0) {
    echo "Found {$allBalances->count()} records:" . PHP_EOL;
    foreach ($allBalances as $b) {
        echo "  - Date: {$b->balance_date}, Balance: Rs. {$b->opening_balance}, Company: {$b->company_code}, Section: {$b->section_code}" . PHP_EOL;
    }
} else {
    echo "✗ No records found for this user" . PHP_EOL;
}

// Check today's records for all users
echo PHP_EOL . "Query 4: All records for date {$date}" . PHP_EOL;
$todayBalances = DB::table('day_opening_balances')
    ->where('balance_date', $date)
    ->get();

if ($todayBalances->count() > 0) {
    echo "Found {$todayBalances->count()} records:" . PHP_EOL;
    foreach ($todayBalances as $b) {
        echo "  - User: {$b->user_id}, Balance: Rs. {$b->opening_balance}, Company: {$b->company_code}, Section: {$b->section_code}" . PHP_EOL;
    }
} else {
    echo "✗ No records found for this date" . PHP_EOL;
}

echo PHP_EOL . "=== Check Complete ===" . PHP_EOL;
