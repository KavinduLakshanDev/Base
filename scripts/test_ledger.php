<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$customer = \App\Models\Customer::where('AdrCd', 'CUS267')->first();
$fromDate = \Carbon\Carbon::parse('2026-03-16');
$toDate = \Carbon\Carbon::parse('2026-06-16');

$custReturns = \App\Models\CustomerReturn::where('customer_id', $customer->AdrKy)
    ->whereBetween('return_date', [$fromDate, $toDate])
    ->get();

echo "Returns found: " . $custReturns->count() . "\n";
foreach($custReturns as $r) {
    echo "Return: " . $r->return_no . " Date: " . $r->return_date . "\n";
}

$paymentsQuery = \App\Models\CustomerPayment::where('customer_id', $customer->AdrKy)
    ->whereBetween('date', [$fromDate, $toDate])
    ->get();

echo "Payments found: " . $paymentsQuery->count() . "\n";
foreach($paymentsQuery as $p) {
    echo "Payment: " . $p->amount . " Date: " . $p->date . " Ref: " . $p->reference . "\n";
}
