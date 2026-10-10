<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Check service job
$job = \App\Models\ServiceJob::where('job_number', 'SJ000005')->first();

if (!$job) {
    echo "Job not found\n";
    exit;
}

echo "=== SERVICE JOB DATA ===\n";
echo "Job Number: {$job->job_number}\n";
echo "Invoice Number: {$job->invoice_number}\n";
echo "AccKy: {$job->AccKy}\n";
echo "Is VAT Invoice: " . ($job->is_vat_invoice ? 'YES' : 'NO') . "\n";
echo "VAT Rate: " . ($job->vat_rate ?? 'NULL') . "\n";
echo "Subtotal Before VAT: " . ($job->subtotal_before_vat ?? 'NULL') . "\n";
echo "VAT Amount: " . ($job->vat_amount ?? 'NULL') . "\n";
echo "Company VAT No: " . ($job->company_vat_no ?? 'NULL') . "\n";
echo "Customer VAT No: " . ($job->customer_vat_no ?? 'NULL') . "\n";

// Check customer
echo "\n=== CUSTOMER DATA ===\n";
$customer = \App\Models\AccMas::where('AccKy', $job->AccKy)->first();
if ($customer) {
    echo "Customer: {$customer->AccNam}\n";
    echo "VAT Registered: " . ($customer->fVATRegistered ? 'YES' : 'NO') . "\n";
    echo "VAT Number: " . ($customer->VATNo ?? 'NULL') . "\n";
    echo "VATNo is empty: " . (empty($customer->VATNo) ? 'YES' : 'NO') . "\n";
    echo "VATNo raw value: '" . $customer->VATNo . "'\n";
} else {
    echo "Customer not found\n";
}

// Check company
echo "\n=== COMPANY DATA ===\n";
$authUser = \App\Models\User::first();
if ($authUser) {
    $company = \App\Models\Company::where('company_code', $authUser->company_code)->first();
    if ($company) {
        echo "Company: {$company->company_name}\n";
        echo "Company VAT Rate: " . ($company->vat_rate ?? 'NULL') . "\n";
        echo "Company VAT No: " . ($company->vat_no ?? 'NULL') . "\n";
    } else {
        echo "Company not found\n";
    }
}
