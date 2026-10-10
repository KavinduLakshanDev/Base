<?php

/**
 * Test script to verify serial number search functionality
 * Run with: php scripts/test_serial_search.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Testing Serial Number Search ===\n\n";

// Test serial number
$testSerial = '995553326';

echo "1. Searching for serial number: {$testSerial}\n";
echo str_repeat('-', 50) . "\n";

// Search in sales_transaction_items
echo "\n[Step 1] Searching sales_transaction_items table...\n";
$saleItem = DB::table('sales_transaction_items')
    ->where(function($query) use ($testSerial) {
        $query->where('serial_number', $testSerial)
              ->orWhere('barcode', $testSerial);
    })
    ->orderBy('id', 'desc')
    ->first();

if ($saleItem) {
    echo "✓ Found sale item:\n";
    echo "  - ID: {$saleItem->id}\n";
    echo "  - Transaction ID: {$saleItem->sales_transaction_id}\n";
    echo "  - Brand: {$saleItem->brand}\n";
    echo "  - Model: {$saleItem->model}\n";
    echo "  - Serial: {$saleItem->serial_number}\n";
    echo "  - Barcode: {$saleItem->barcode}\n";
    echo "  - Warranty: {$saleItem->warranty}\n";
    
    // Get sales transaction
    echo "\n[Step 2] Getting sales transaction details...\n";
    $salesTransaction = DB::table('sales_transactions')
        ->where('id', $saleItem->sales_transaction_id)
        ->first();
    
    if ($salesTransaction) {
        echo "✓ Found sales transaction:\n";
        echo "  - Transaction ID: {$salesTransaction->id}\n";
        echo "  - Invoice No: {$salesTransaction->invoice_no}\n";
        echo "  - Date: {$salesTransaction->transaction_date}\n";
        echo "  - Customer ID: " . ($salesTransaction->customer_id ?? 'NULL') . "\n";
        echo "  - Customer Code: " . ($salesTransaction->customer_code ?? 'NULL') . "\n";
        echo "  - Customer Name: " . ($salesTransaction->customer_name ?? 'NULL') . "\n";
        
        // Get customer from acc_mas
        if (!empty($salesTransaction->customer_id)) {
            echo "\n[Step 3] Getting customer from acc_mas (by customer_id)...\n";
            $customer = DB::table('acc_mas')
                ->where('AccKy', $salesTransaction->customer_id)
                ->first();
            
            if ($customer) {
                echo "✓ Found customer in acc_mas:\n";
                echo "  - AccKy: {$customer->AccKy}\n";
                echo "  - AccCd: {$customer->AccCd}\n";
                echo "  - AccNm: {$customer->AccNm}\n";
                
                // Get address
                echo "\n[Step 4] Getting address (by AccKy)...\n";
                $address = DB::table('address')
                    ->where('AccKy', $customer->AccKy)
                    ->where('AdrTypKy', 1)
                    ->first();
                
                if ($address) {
                    echo "✓ Found address:\n";
                    echo "  - AdrKy: {$address->AdrKy}\n";
                    echo "  - AccKy: {$address->AccKy}\n";
                    echo "  - Phone (TP1): " . ($address->TP1 ?? 'NULL') . "\n";
                    echo "  - Phone (TP2): " . ($address->TP2 ?? 'NULL') . "\n";
                    echo "  - Email: " . ($address->Email ?? 'NULL') . "\n";
                    echo "  - Address: " . ($address->Address ?? 'NULL') . "\n";
                } else {
                    echo "✗ No address found for AccKy: {$customer->AccKy}\n";
                }
            } else {
                echo "✗ No customer found in acc_mas for customer_id: {$salesTransaction->customer_id}\n";
            }
        } elseif (!empty($salesTransaction->customer_code)) {
            echo "\n[Step 3] Getting customer from acc_mas (by customer_code)...\n";
            $customer = DB::table('acc_mas')
                ->where('AccCd', $salesTransaction->customer_code)
                ->first();
            
            if ($customer) {
                echo "✓ Found customer in acc_mas:\n";
                echo "  - AccKy: {$customer->AccKy}\n";
                echo "  - AccCd: {$customer->AccCd}\n";
                echo "  - AccNm: {$customer->AccNm}\n";
                
                // Get address
                echo "\n[Step 4] Getting address (by AccKy)...\n";
                $address = DB::table('address')
                    ->where('AccKy', $customer->AccKy)
                    ->where('AdrTypKy', 1)
                    ->first();
                
                if ($address) {
                    echo "✓ Found address:\n";
                    echo "  - AdrKy: {$address->AdrKy}\n";
                    echo "  - AccKy: {$address->AccKy}\n";
                    echo "  - Phone (TP1): " . ($address->TP1 ?? 'NULL') . "\n";
                    echo "  - Phone (TP2): " . ($address->TP2 ?? 'NULL') . "\n";
                    echo "  - Email: " . ($address->Email ?? 'NULL') . "\n";
                    echo "  - Address: " . ($address->Address ?? 'NULL') . "\n";
                } else {
                    echo "✗ No address found for AccKy: {$customer->AccKy}\n";
                }
            } else {
                echo "✗ No customer found in acc_mas for customer_code: {$salesTransaction->customer_code}\n";
            }
        } else {
            echo "\n✗ No customer_id or customer_code in sales transaction\n";
        }
        
        // Get all items from this sale
        echo "\n[Step 5] Getting all items from this sale...\n";
        $allItems = DB::table('sales_transaction_items')
            ->where('sales_transaction_id', $salesTransaction->id)
            ->get();
        
        echo "✓ Found {$allItems->count()} items in this sale:\n";
        foreach ($allItems as $item) {
            echo "  - {$item->item_name} (Code: {$item->item_code}, Qty: {$item->quantity})\n";
        }
        
    } else {
        echo "✗ Sales transaction not found for ID: {$saleItem->sales_transaction_id}\n";
    }
} else {
    echo "✗ No sale item found for serial number: {$testSerial}\n";
    echo "\nSearching for any sales_transaction_items with serial numbers...\n";
    $anySales = DB::table('sales_transaction_items')
        ->whereNotNull('serial_number')
        ->where('serial_number', '!=', '')
        ->limit(5)
        ->get(['id', 'serial_number', 'brand', 'model']);
    
    if ($anySales->count() > 0) {
        echo "Found {$anySales->count()} items with serial numbers:\n";
        foreach ($anySales as $item) {
            echo "  - Serial: {$item->serial_number} | Brand: {$item->brand} | Model: {$item->model}\n";
        }
    } else {
        echo "No items with serial numbers found in database.\n";
    }
}

echo "\n" . str_repeat('=', 50) . "\n";
echo "Test complete!\n";
