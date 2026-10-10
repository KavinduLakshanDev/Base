<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$return = \App\Models\CustomerReturn::where('original_invoice_no', 'VIS-PRI-000107')->first();
if($return) { 
    echo 'Return Date: ' . $return->return_date . "\n";
    echo 'Created At: ' . $return->created_at . "\n";
} else { 
    echo 'No return found'; 
}
