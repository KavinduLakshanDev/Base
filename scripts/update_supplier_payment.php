<?php

require_once 'vendor/autoload.php';

use Illuminate\Http\Request;
use App\Models\SupplierPayment;

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    // Update the supplier payment with id=1 to set created_by_id=1
    $payment = SupplierPayment::find(1);
    if ($payment) {
        $payment->created_by_id = 1;
        $payment->save();
        echo "Updated supplier payment id=1, set created_by_id=1\n";
    } else {
        echo "Supplier payment with id=1 not found\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}