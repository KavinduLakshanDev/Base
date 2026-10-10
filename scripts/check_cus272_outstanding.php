<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Customer;
use App\Models\ServiceJob;
use App\Models\SalesTransaction;
use App\Models\CustomerPayment;
use App\Models\AccTrn;
use Illuminate\Support\Facades\DB;

// Find CUS272
$customer = Customer::where('AdrCd', 'CUS272')->first();

if (!$customer) {
    echo "❌ Customer CUS272 not found.\n";
    exit(1);
}

echo "===========================================\n";
echo " CUSTOMER OUTSTANDING CHECK\n";
echo "===========================================\n";
echo " Name   : " . $customer->FstNm . " " . ($customer->LstNm ?? '') . "\n";
echo " Code   : " . $customer->AdrCd . "\n";
echo " AdrKy  : " . $customer->AdrKy . "\n";
echo " AccKy  : " . ($customer->AccKy ?? 'N/A') . "\n";
echo "===========================================\n\n";

$accKy = $customer->AccKy;
$adrKy = $customer->AdrKy;

if (!$accKy) {
    echo "⚠️  No AccKy (ledger account) linked. Cannot calculate full outstanding.\n";
    exit(1);
}

// 1. Service Jobs
$totalBilledJobs = (float) ServiceJob::where('AccKy', $accKy)
    ->where('status', '!=', 'cancelled')
    ->sum('total_amount');

$totalAdvanced = (float) ServiceJob::where('AccKy', $accKy)
    ->where('status', '!=', 'cancelled')
    ->sum('advanced_payment');

$pendingJobs = ServiceJob::where('AccKy', $accKy)
    ->where('status', '!=', 'cancelled')
    ->where('balance_amount', '>', 0)
    ->get(['id', 'job_number', 'total_amount', 'advanced_payment', 'paid_amount', 'balance_amount', 'status', 'device_model', 'device_brand']);

echo "--- Pending Service Jobs ---\n";
if ($pendingJobs->isEmpty()) {
    echo "  (none)\n";
} else {
    foreach ($pendingJobs as $job) {
        echo "  Job: {$job->job_number} | Device: {$job->device_model} | Status: {$job->status} | Balance: Rs " . number_format($job->balance_amount, 2) . "\n";
    }
}
echo "\n";

// 2. Sales Invoices
$totalBilledInvoices = (float) SalesTransaction::where('customer_id', $adrKy)->sum('total_amount');
$pendingInvoices = SalesTransaction::where('customer_id', $adrKy)
    ->where('balance_amount', '>', 0)
    ->get(['id', 'invoice_no', 'transaction_date', 'total_amount', 'balance_amount']);

echo "--- Pending Sales Invoices ---\n";
if ($pendingInvoices->isEmpty()) {
    echo "  (none)\n";
} else {
    foreach ($pendingInvoices as $inv) {
        echo "  Invoice: {$inv->invoice_no} | Date: {$inv->transaction_date} | Total: Rs " . number_format($inv->total_amount, 2) . " | Balance: Rs " . number_format($inv->balance_amount, 2) . "\n";
    }
}
echo "\n";

// 3. Returns
$totalReturns = (float) \App\Models\CustomerReturn::where('customer_id', $adrKy)
    ->where('status', '!=', 'cancelled')
    ->sum('return_value');

$totalExchanges = (float) \App\Models\CustomerReturn::where('customer_id', $adrKy)
    ->where('status', '!=', 'cancelled')
    ->sum('exchange_amount');

// 4. Payments
$totalPaid = (float) CustomerPayment::withoutServiceAdvancePayments()
    ->where('customer_id', $adrKy)
    ->where('method', '!=', 'exchange_balance_due')
    ->sum('amount');

// 5. Debits (returned cheques etc.)
$totalDebits = (float) AccTrn::where('AccKy', $accKy)
    ->where('FInAct', true)
    ->where('Status', 'A')
    ->where('Amt', '>', 0)
    ->sum('Amt');

// 6. Applied credit
$totalAppliedCredit = (float) SalesTransaction::where('customer_id', $adrKy)
    ->whereNotNull('payment_details')
    ->get(['payment_details'])
    ->sum(function ($tx) {
        $details = is_array($tx->payment_details) ? $tx->payment_details : json_decode($tx->payment_details, true);
        return (float)($details['applied_credit'] ?? 0);
    });

// 7. Opening balance
$openingBalance = (float) ($customer->account?->opening_balance ?? 0);

// Final calculation
$outstanding = $openingBalance + $totalBilledJobs + $totalBilledInvoices
    - $totalReturns + $totalExchanges
    - $totalAdvanced - $totalPaid - $totalAppliedCredit + $totalDebits;

echo "===========================================\n";
echo " BREAKDOWN\n";
echo "===========================================\n";
printf("  Opening Balance        : Rs %12.2f\n", $openingBalance);
printf("  Total Billed (Jobs)    : Rs %12.2f\n", $totalBilledJobs);
printf("  Total Billed (Invoices): Rs %12.2f\n", $totalBilledInvoices);
printf("  Total Returns          : Rs %12.2f (credit)\n", $totalReturns);
printf("  Total Exchanges        : Rs %12.2f (debit)\n", $totalExchanges);
printf("  Advanced Payments      : Rs %12.2f (credit)\n", $totalAdvanced);
printf("  Total Paid             : Rs %12.2f (credit)\n", $totalPaid);
printf("  Applied Credit         : Rs %12.2f (credit)\n", $totalAppliedCredit);
printf("  Financial Debits       : Rs %12.2f (debit)\n", $totalDebits);
echo "-------------------------------------------\n";
if ($outstanding > 0) {
    printf("  *** OUTSTANDING BALANCE: Rs %12.2f (OWES) ***\n", $outstanding);
} elseif ($outstanding < 0) {
    printf("  *** CREDIT BALANCE    : Rs %12.2f (OVERPAID) ***\n", abs($outstanding));
} else {
    echo "  *** BALANCE: Rs 0.00 — FULLY SETTLED ***\n";
}
echo "===========================================\n";
