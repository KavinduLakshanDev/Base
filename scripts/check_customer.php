<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$cust = \App\Models\Customer::where('AdrCd', 'CUS267')->first();
if($cust) { 
    echo 'AdrKy: ' . $cust->AdrKy . "\n";
} else { 
    echo 'No customer found'; 
}
