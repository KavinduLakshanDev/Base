<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Find the return
$return = App\Models\CustomerReturn::where('return_no', 'R-VIS-SEC-003-0010')->first();
if ($return) {
    $return->refund_amount = 10000.00;
    $return->save();
    echo "Updated CustomerReturn.\n";
}

// Find the refund payment
$payment = App\Models\CustomerPayment::where('reference', 'R-VIS-SEC-003-0010')
    ->where('amount', -105850.00)
    ->first();
if ($payment) {
    $payment->amount = -10000.00;
    $payment->save();
    echo "Updated CustomerPayment.\n";
}

echo "Database fix applied successfully.\n";
