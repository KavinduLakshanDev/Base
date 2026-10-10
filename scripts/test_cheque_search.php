<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\AccTrn;
use App\Models\User;

echo "=== Testing Cheque Search Logic ===\n\n";

// Get a test user to simulate the search
$user = User::where('email', 'admin@vismass.com')->first();

if (!$user) {
    echo "No admin user found. Using first available user.\n";
    $user = User::first();
}

if (!$user) {
    echo "ERROR: No users in database!\n";
    exit(1);
}

echo "Testing with User: " . $user->email . "\n";
echo "User Role ID: " . $user->role_id . "\n";
echo "User Section: " . $user->section_code . "\n";
echo "User Company: " . $user->company_code . "\n\n";

// Test Search 1: The exact cheque from screenshot
echo "=== Test 1: Search for 11111111111 (11 ones) ===\n";
$cheque_no = '11111111111';
$bank_name = 'BOC';
$branch_name = 'Dunagaha';

$query1 = AccTrn::where('ChqueNo', trim($cheque_no))
    ->where('BankNm', trim($bank_name))
    ->where('BranchNm', trim($branch_name))
    ->where('FInAct', true)
    ->where('Status', 'A')
    ->where('Amt', '<', 0)
    ->where('company_code', $user->company_code);

if ($user->section_code && $user->role_id !== 1) {
    $query1->where('section_code', $user->section_code);
}

echo "SQL: " . $query1->toSql() . "\n";
$result1 = $query1->get();
echo "Results found: " . $result1->count() . "\n\n";

// Test Search 2: Correct cheque number (12 ones)
echo "=== Test 2: Search for 111111111111 (12 ones) ===\n";
$cheque_no = '111111111111';

$query2 = AccTrn::where('ChqueNo', trim($cheque_no))
    ->where('BankNm', trim($bank_name))
    ->where('BranchNm', trim($branch_name))
    ->where('FInAct', true)
    ->where('Status', 'A')
    ->where('Amt', '<', 0)
    ->where('company_code', $user->company_code);

if ($user->section_code && $user->role_id !== 1) {
    $query2->where('section_code', $user->section_code);
}

$result2 = $query2->get();
echo "Results found: " . $result2->count() . "\n";

if ($result2->count() > 0) {
    foreach ($result2 as $cheque) {
        echo "  - ID: " . $cheque->AccTrnKy . "\n";
        echo "    Cheque: " . $cheque->ChqueNo . "\n";
        echo "    Bank: " . $cheque->BankNm . "\n";
        echo "    Branch: " . $cheque->BranchNm . "\n";
        echo "    Amount: " . $cheque->Amt . "\n";
        echo "    Section: " . $cheque->section_code . "\n";
    }
}

echo "\n=== Test 3: Search WITHOUT branch filter ===\n";
$query3 = AccTrn::where('ChqueNo', '111111111111')
    ->where('BankNm', 'BOC')
    ->where('FInAct', true)
    ->where('Status', 'A')
    ->where('Amt', '<', 0)
    ->where('company_code', $user->company_code);

if ($user->section_code && $user->role_id !== 1) {
    $query3->where('section_code', $user->section_code);
}

$result3 = $query3->get();
echo "Results found: " . $result3->count() . "\n";

if ($result3->count() > 0) {
    foreach ($result3 as $cheque) {
        echo "  - ID: " . $cheque->AccTrnKy . "\n";
        echo "    Cheque: " . $cheque->ChqueNo . "\n";
        echo "    Section: " . $cheque->section_code . "\n";
        echo "    User Section: " . $user->section_code . "\n";
        echo "    MATCH: " . ($cheque->section_code === $user->section_code ? 'YES' : 'NO') . "\n";
    }
}

echo "\n=== All cheques for this user's company ===\n";
$allCheques = AccTrn::whereNotNull('ChqueNo')
    ->where('FInAct', true)
    ->where('Status', 'A')
    ->where('Amt', '<', 0)
    ->where('company_code', $user->company_code)
    ->get(['AccTrnKy', 'ChqueNo', 'BankNm', 'BranchNm', 'section_code']);

foreach ($allCheques as $c) {
    echo "ID: " . $c->AccTrnKy . " | Cheque: " . $c->ChqueNo . " | Bank: " . $c->BankNm . " | Branch: " . ($c->BranchNm ?: 'EMPTY') . " | Section: " . $c->section_code . "\n";
}
