<?php

/**
 * Quick script to test invoice lookup functionality
 * Run with: php test_invoice_lookup.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Testing Invoice Lookup ===\n\n";

// Check if sales_transactions table exists and what columns it has
$columns = \Illuminate\Support\Facades\Schema::getColumnListing('sales_transactions');
echo "sales_transactions columns:\n";
foreach ($columns as $col) {
    echo "  - $col\n";
}
echo "\n";

// Check if company_code exists
$hasCompanyCode = \Illuminate\Support\Facades\Schema::hasColumn('sales_transactions', 'company_code');
echo "Has company_code column: " . ($hasCompanyCode ? 'YES (SHOULD BE NO!)' : 'NO (correct)') . "\n\n";

// Try to find an existing invoice
$testInvoices = ['VIS-ITM-000002', 'VIS-ITM-000001', 'VIS-PRI-000001'];

echo "Searching for existing invoices:\n";
foreach ($testInvoices as $invoiceNo) {
    $sale = \App\Models\SalesTransaction::where('invoice_no', $invoiceNo)->first();
    if ($sale) {
        echo "  ✓ Found: $invoiceNo (ID: {$sale->id}, Section: {$sale->section_code})\n";
    } else {
        echo "  ✗ Not found: $invoiceNo\n";
    }
}

echo "\n=== Test Complete ===\n";
