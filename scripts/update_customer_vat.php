<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Update customer VAT number
$customer = \App\Models\AccMas::where('AccKy', 4)->first();

if ($customer) {
    echo "Current Customer Data:\n";
    echo "Name: {$customer->AccNam}\n";
    echo "VAT Registered: " . ($customer->fVATRegistered ? 'YES' : 'NO') . "\n";
    echo "Current VAT No: '" . ($customer->VATNo ?? 'NULL') . "'\n\n";
    
    // Update VAT number
    $customer->VATNo = '987654321V'; // Sample VAT number
    $customer->save();
    
    echo "Updated Customer Data:\n";
    echo "New VAT No: {$customer->VATNo}\n";
    echo "Success!\n";
} else {
    echo "Customer not found\n";
}
