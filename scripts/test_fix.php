<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\AccTrn;
use App\Models\User;

echo "=== Testing Cheque Search AFTER Fix ===\n\n";

$user = User::where('section_code', 'VIS-SEC-001')->first();

if (!$user) {
    echo "No user in VIS-SEC-001 found.\n";
    $user = User::first();
}

echo "Testing with User: " . $user->email . "\n";
echo "User Section: " . $user->section_code . "\n";
echo "User Company: " . $user->company_code . "\n\n";

// Test the search logic WITHOUT section filter
echo "=== Search for 111111111111 (12 ones) - NO SECTION FILTER ===\n";
$cheque_no = '111111111111';
$bank_name = 'BOC';
$branch_name = 'Dunagaha';

$query = AccTrn::where('ChqueNo', trim($cheque_no))
    ->where('BankNm', trim($bank_name))
    ->where('BranchNm', trim($branch_name))
    ->where('FInAct', true)
    ->where('Status', 'A')
    ->where('Amt', '<', 0)
    ->where('company_code', $user->company_code);

// NO section filter now!

$result = $query->get();
echo "Results found: " . $result->count() . "\n";

if ($result->count() > 0) {
    foreach ($result as $cheque) {
        echo "\n✅ FOUND!\n";
        echo "  ID: " . $cheque->AccTrnKy . "\n";
        echo "  Cheque No: " . $cheque->ChqueNo . "\n";
        echo "  Bank: " . $cheque->BankNm . "\n";
        echo "  Branch: " . $cheque->BranchNm . "\n";
        echo "  Amount: " . $cheque->Amt . "\n";
        echo "  Section: " . $cheque->section_code . "\n";
        echo "  User Section: " . $user->section_code . "\n";
        echo "  Cross-section return: " . ($cheque->section_code !== $user->section_code ? 'YES ✅' : 'NO') . "\n";
    }
} else {
    echo "❌ Still not found. Check if cheque exists.\n";
}
