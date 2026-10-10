<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Checking Supplier SUP001 Balance ===\n\n";

// Get supplier from address
$supplier = DB::table('address')->where('AdrCd', 'SUP001')->first();
echo "Supplier Details:\n";
echo "  Code: " . $supplier->AdrCd . "\n";
echo "  Name: " . $supplier->FstNm . " " . $supplier->LstNm . "\n";
echo "  AccKy: " . $supplier->AccKy . "\n\n";

// Get account balance
$account = DB::table('acc_mas')->where('AccKy', $supplier->AccKy)->first();
echo "Account Details:\n";
echo "  AccKy: " . ($account->AccKy ?? 'NULL') . "\n";
echo "  AccNm: " . ($account->AccNm ?? 'NULL') . "\n";
echo "  CurBal: " . ($account->CurBal ?? 'NULL') . "\n\n";

// Get purchases for this supplier
$purchases = DB::table('purchase')
    ->where('SuppCode', 'SUP001')
    ->orWhere('AccKy', $supplier->AccKy)
    ->get(['PurchaseKey', 'PurchaseNo', 'GRNDate', 'SuppCode', 'TotalVal', 'AccKy']);

echo "Purchases:\n";
if ($purchases->count() > 0) {
    foreach ($purchases as $purchase) {
        echo "  Purchase #" . $purchase->PurchaseNo . " - Total: " . $purchase->TotalVal . " - Date: " . $purchase->GRNDate . " - AccKy: " . $purchase->AccKy . "\n";
    }
    echo "\n  Total Outstanding: " . $purchases->sum('TotalVal') . "\n";
} else {
    echo "  No purchases found\n";
}

echo "\n";

// Get supplier payments
$payments = DB::table('supplier_payments')
    ->where('supplier_code', 'SUP001')
    ->get(['payment_no', 'paid_amount', 'payment_date']);

echo "Supplier Payments:\n";
if ($payments->count() > 0) {
    foreach ($payments as $payment) {
        echo "  Payment #" . $payment->payment_no . " - Amount: " . $payment->paid_amount . " - Date: " . $payment->payment_date . "\n";
    }
    echo "\n  Total Payments: " . $payments->sum('paid_amount') . "\n";
} else {
    echo "  No payments found\n";
}

echo "\n=== Calculated Balance ===\n";
$totalPurchases = $purchases->sum('TotalVal');
$totalPayments = $payments->sum('paid_amount');
$calculatedBalance = $totalPurchases - $totalPayments;
echo "Purchases: " . $totalPurchases . "\n";
echo "Payments: " . $totalPayments . "\n";
echo "Expected Balance: " . $calculatedBalance . "\n";
echo "Actual Balance (from acc_mas): " . ($account->CurBal ?? '0') . "\n";
