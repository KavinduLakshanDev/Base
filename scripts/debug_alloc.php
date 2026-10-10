<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$c = \App\Models\CustomerPayment::where('method', 'cash')->whereNull('invoice_allocations')->whereNull('sales_transaction_id')->whereNull('service_job_id')->count();
echo "Payments with NO allocation/invoice/job: $c\n";

$c2 = \App\Models\CustomerPayment::where('method', 'cash')->whereNotNull('sales_transaction_id')->count();
echo "Payments with single sales_transaction_id: $c2\n";

$c3 = \App\Models\CustomerPayment::where('method', 'cash')->whereNotNull('invoice_allocations')->count();
echo "Payments with invoice_allocations: $c3\n";

$c4 = \App\Models\CustomerPayment::where('method', 'cash')->whereNotNull('service_job_id')->count();
echo "Payments with service_job_id: $c4\n";
