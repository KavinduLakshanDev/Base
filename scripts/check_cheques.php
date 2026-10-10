<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\AccTrn;

echo "=== Checking Cheque Payments in Database ===\n\n";

// Check all cheque payments
$cheques = AccTrn::whereNotNull('ChqueNo')
    ->where('FInAct', true)
    ->where('Status', 'A')
    ->where('Amt', '<', 0)
    ->orderBy('TrnDt', 'desc')
    ->limit(10)
    ->get();

echo "Total cheque payments found: " . $cheques->count() . "\n\n";

if ($cheques->count() > 0) {
    foreach($cheques as $cheque) {
        echo "-----------------------------------\n";
        echo "ID: " . $cheque->AccTrnKy . "\n";
        echo "Cheque No: [" . $cheque->ChqueNo . "]\n";
        echo "Bank Name: [" . $cheque->BankNm . "]\n";
        echo "Branch Name: [" . $cheque->BranchNm . "]\n";
        echo "Amount: " . $cheque->Amt . "\n";
        echo "Date: " . $cheque->TrnDt . "\n";
        echo "Company: " . $cheque->company_code . "\n";
        echo "Section: " . $cheque->section_code . "\n";
        echo "-----------------------------------\n\n";
    }
} else {
    echo "No cheque payments found in the database!\n";
    echo "\nChecking if ANY AccTrn records exist...\n";
    $total = AccTrn::count();
    echo "Total AccTrn records: " . $total . "\n";
    
    if ($total > 0) {
        echo "\nSample AccTrn records:\n";
        $samples = AccTrn::limit(5)->get();
        foreach($samples as $s) {
            echo "AccTrnKy: " . $s->AccTrnKy . " | ChqueNo: " . ($s->ChqueNo ?? 'NULL') . " | Amt: " . $s->Amt . "\n";
        }
    }
}

// Now search for the specific cheque the user is looking for
echo "\n=== Searching for Cheque: 741147741, BOC, Dunagaha ===\n\n";

$specificCheque = AccTrn::where('ChqueNo', '741147741')
    ->where('BankNm', 'BOC')
    ->where('BranchNm', 'Dunagaha')
    ->first();

if ($specificCheque) {
    echo "FOUND!\n";
    echo json_encode($specificCheque, JSON_PRETTY_PRINT);
} else {
    echo "NOT FOUND with exact match.\n\n";
    
    // Try with LIKE
    echo "Trying case-insensitive search...\n";
    $likeSearch = AccTrn::where('ChqueNo', 'like', '%741147741%')
        ->get();
    
    if ($likeSearch->count() > 0) {
        echo "Found " . $likeSearch->count() . " records with similar cheque number:\n";
        foreach($likeSearch as $item) {
            echo "ChqueNo: [" . $item->ChqueNo . "] | Bank: [" . $item->BankNm . "] | Branch: [" . $item->BranchNm . "]\n";
        }
    } else {
        echo "No records found even with LIKE search.\n";
    }
}
