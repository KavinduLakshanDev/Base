<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Get the service job
$job = \App\Models\ServiceJob::where('job_number', 'SJ000005')->first();

if (!$job) {
    echo "Job not found\n";
    exit;
}

echo "=== UPDATING SERVICE JOB SJ000005 WITH VAT DATA ===\n\n";

// Get customer and company info
$customer = \App\Models\AccMas::where('AccKy', $job->AccKy)->first();
$authUser = \App\Models\User::first();
$company = \App\Models\Company::where('company_code', $authUser->company_code)->first();

if ($customer && $customer->fVATRegistered) {
    echo "Customer is VAT registered, applying VAT...\n";
    
    // Update job with VAT info
    $job->is_vat_invoice = true;
    $job->customer_vat_no = $customer->VATNo;
    $job->company_vat_no = $company->vat_no ?? '123456789V';
    $job->vat_rate = $company->vat_rate ?? 15.00;
    
    // Update all items with VAT
    foreach ($job->items as $item) {
        $vatInclusive = false;
        $vatRate = $job->vat_rate;
        
        // Check if item should have VAT
        if ($item->ItmKy) {
            $itemMaster = \App\Models\ItemMaster::where('ItmKy', $item->ItmKy)->first();
            if ($itemMaster && $itemMaster->VATItem) {
                $vatInclusive = true;
            }
        }
        
        echo "Item: {$item->item_name} - VAT Inclusive: " . ($vatInclusive ? 'YES' : 'NO') . "\n";
        
        $item->vat_inclusive = $vatInclusive;
        $item->vat_rate = $vatRate;
        $item->save(); // This will trigger the boot() method to calculate VAT
        
        echo "  - Price: {$item->total_price}\n";
        echo "  - Price Before VAT: {$item->price_before_vat}\n";
        echo "  - VAT Amount: {$item->vat_amount}\n\n";
    }
    
    // Now update job totals
    $job->updateTotals();
    $job->save();
    
    echo "\n=== UPDATED JOB DATA ===\n";
    echo "Is VAT Invoice: " . ($job->is_vat_invoice ? 'YES' : 'NO') . "\n";
    echo "VAT Rate: {$job->vat_rate}%\n";
    echo "Subtotal Before VAT: {$job->subtotal_before_vat}\n";
    echo "VAT Amount: {$job->vat_amount}\n";
    echo "Total Amount: {$job->total_amount}\n";
    echo "Company VAT No: {$job->company_vat_no}\n";
    echo "Customer VAT No: {$job->customer_vat_no}\n";
    
    echo "\nJob updated successfully!\n";
} else {
    echo "Customer is not VAT registered\n";
}
