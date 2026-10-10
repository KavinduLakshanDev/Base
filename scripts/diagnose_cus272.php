<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Customer;
use App\Models\CustomerPayment;
use App\Models\SalesTransaction;

$adrKy = 343; // CUS272

echo "=== ALL PAYMENTS FOR CUS272 (adrKy=$adrKy) ===\n";
$payments = CustomerPayment::where('customer_id', $adrKy)->orderBy('id')->get();
foreach ($payments as $p) {
    echo "  ID:{$p->id} | Amount: Rs " . number_format($p->amount, 2)
        . " | sales_transaction_id: " . ($p->sales_transaction_id ?? 'NULL')
        . " | service_job_id: " . ($p->service_job_id ?? 'NULL')
        . " | method: {$p->method}"
        . " | date: {$p->date}"
        . "\n";
}

echo "\n=== VIS-PRI-000346 DETAILS ===\n";
$invoice = SalesTransaction::where('invoice_no', 'VIS-PRI-000346')->first();
if ($invoice) {
    echo "  ID                  : " . $invoice->id . "\n";
    echo "  customer_id         : " . $invoice->customer_id . "\n";
    echo "  total_amount        : Rs " . number_format($invoice->total_amount, 2) . "\n";
    echo "  balance_amount      : Rs " . number_format($invoice->balance_amount, 2) . "\n";
    echo "  transaction_date    : " . $invoice->transaction_date . "\n";

    $details = is_array($invoice->payment_details)
        ? $invoice->payment_details
        : json_decode($invoice->payment_details, true);
    echo "  payment_details     : " . json_encode($details, JSON_PRETTY_PRINT) . "\n";
    
    echo "\n  applied_credit = Rs " . number_format((float)($details['applied_credit'] ?? 0), 2) . "\n";
} else {
    echo "  VIS-PRI-000346 not found!\n";
}
