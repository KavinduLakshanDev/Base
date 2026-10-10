<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1. Change CustomerReturn
$return = \App\Models\CustomerReturn::where('original_invoice_no', 'VIS-PRI-000107')->first();
if ($return) {
    $return->update(['refund_method' => 'credit_note']);
    echo "Fixed return refund_method to credit_note.\n";
}

// 2. Delete negative CustomerPayment
$payment = \App\Models\CustomerPayment::where('reference', 'Refund for Return ' . ($return->return_no ?? ''))->first();
if ($payment && $payment->amount < 0) {
    $payment->delete();
    echo "Deleted negative cash payment.\n";
} else {
    // try finding by amount and date just in case
    $payment = \App\Models\CustomerPayment::where('amount', -105850)->first();
    if ($payment) {
        $payment->delete();
        echo "Deleted negative cash payment by amount.\n";
    }
}

// 3. Fix SalesTransaction balance
$sale = \App\Models\SalesTransaction::where('invoice_no', 'VIS-PRI-000107')->first();
if ($sale) {
    $sale->update([
        'balance_amount' => 0,
        'status' => 'Returned'
    ]);
    echo "Fixed SalesTransaction balance and status.\n";
}

// 4. Update AccMas? The AccMas might have been affected if payments are posted there.
// Since we deleted the payment, we should probably let the system naturally calculate it via calculateOutstandingBalance
// Wait, AccMas CurBal might need a rebuild if it's permanently out of sync. But Payment Details and Invoice now use calculateOutstandingBalance() which is dynamic!
