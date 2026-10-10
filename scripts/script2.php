<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$invoice = App\Models\SalesTransaction::where('invoice_no', 'VIS-PRI-000107')->first();
if ($invoice) {
    $invoice->balance_amount = 0.00;
    $invoice->status = 'returned'; // or 'paid'
    $invoice->save();
    echo "Invoice updated.\n";
}
