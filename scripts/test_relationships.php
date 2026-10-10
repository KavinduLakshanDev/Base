<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$serial = '74444441111125';

echo "=== COMPLETE DATABASE RELATIONSHIP TEST ===\n";
echo "Serial Number: $serial\n\n";

// Step 1: Find in sales_transaction_items
echo "[STEP 1] Searching sales_transaction_items...\n";
$saleItem = DB::table('sales_transaction_items')
    ->where('serial_number', $serial)
    ->first();

if (!$saleItem) {
    echo "✗ NOT FOUND\n";
    exit;
}

echo "✓ FOUND\n";
echo "  ID: {$saleItem->id}\n";
echo "  Sales Transaction ID: {$saleItem->sales_transaction_id}\n";
echo "  Brand: {$saleItem->brand}\n";
echo "  Model: {$saleItem->model}\n";
echo "  Serial: {$saleItem->serial_number}\n";
echo "  Warranty: {$saleItem->warranty}\n\n";

// Step 2: Get sales_transactions record
echo "[STEP 2] Getting sales_transactions record...\n";
$salesTrx = DB::table('sales_transactions')
    ->where('id', $saleItem->sales_transaction_id)
    ->first();

if (!$salesTrx) {
    echo "✗ NOT FOUND\n";
    exit;
}

echo "✓ FOUND\n";
echo "  Transaction ID: {$salesTrx->id}\n";
echo "  Customer ID: " . ($salesTrx->customer_id ?? 'NULL') . "\n";
echo "  Customer Code: " . ($salesTrx->customer_code ?? 'NULL') . "\n";
echo "  Customer Name: " . ($salesTrx->customer_name ?? 'NULL') . "\n";
echo "  Transaction Date: " . ($salesTrx->transaction_date ?? $salesTrx->created_at) . "\n\n";

// Step 3: Get customer from acc_mas
echo "[STEP 3] Getting customer from acc_mas...\n";
if (empty($salesTrx->customer_id)) {
    echo "✗ customer_id is empty in sales_transactions\n";
    
    // Try with customer_code
    if (!empty($salesTrx->customer_code)) {
        echo "  Trying with customer_code: {$salesTrx->customer_code}\n";
        $customer = DB::table('acc_mas')
            ->where('AccCd', $salesTrx->customer_code)
            ->first();
    } else {
        echo "  customer_code is also empty\n";
        exit;
    }
} else {
    $customer = DB::table('acc_mas')
        ->where('AccKy', $salesTrx->customer_id)
        ->first();
}

if (!$customer) {
    echo "✗ NOT FOUND in acc_mas\n";
    exit;
}

echo "✓ FOUND in acc_mas\n";
echo "  AccKy: {$customer->AccKy}\n";
echo "  AccCd: {$customer->AccCd}\n";
echo "  AccNm: {$customer->AccNm}\n\n";

// Step 4: Get address details
echo "[STEP 4] Getting address record...\n";
$address = DB::table('address')
    ->where('AccKy', $customer->AccKy)
    ->where('AdrTypKy', 1)
    ->first();

if (!$address) {
    echo "✗ NOT FOUND\n";
    echo "  Checking all addresses for this AccKy...\n";
    $allAddresses = DB::table('address')
        ->where('AccKy', $customer->AccKy)
        ->get();
    
    if ($allAddresses->count() > 0) {
        echo "  Found {$allAddresses->count()} address records:\n";
        foreach ($allAddresses as $addr) {
            echo "    - AdrKy: {$addr->AdrKy}, AdrTypKy: {$addr->AdrTypKy}, TP1: " . ($addr->TP1 ?? 'NULL') . "\n";
        }
    } else {
        echo "  No address records found for AccKy: {$customer->AccKy}\n";
    }
    exit;
}

echo "✓ FOUND in address table\n";
echo "  AdrKy: {$address->AdrKy}\n";
echo "  AccKy: {$address->AccKy}\n";
echo "  AdrTypKy: {$address->AdrTypKy}\n";
echo "  TP1: " . ($address->TP1 ?? 'NULL') . "\n";
echo "  TP2: " . ($address->TP2 ?? 'NULL') . "\n";
echo "  TP3: " . ($address->TP3 ?? 'NULL') . "\n";
echo "  Email: " . ($address->Email ?? 'NULL') . "\n";
echo "  Address: " . ($address->Address ?? 'NULL') . "\n";
echo "  City: " . ($address->City ?? 'NULL') . "\n\n";

echo "=== TEST COMPLETE - ALL RELATIONSHIPS WORKING ===\n";
