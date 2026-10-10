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

echo "=== MANUALLY SETTING ITEMS AS VAT INCLUSIVE ===\n\n";

$company = \App\Models\Company::first();
$vatRate = $company->vat_rate ?? 18.00;

foreach ($job->items as $item) {
    echo "Item: {$item->item_name}\n";
    echo "Current Total: {$item->total_price}\n";
    
    // Mark as VAT inclusive
    $item->vat_inclusive = true;
    $item->vat_rate = $vatRate;
    $item->save(); // This will trigger VAT calculation in boot()
    
    echo "Updated with VAT:\n";
    echo "  - Price Before VAT: {$item->price_before_vat}\n";
    echo "  - VAT Amount: {$item->vat_amount}\n";
    echo "  - Total Price: {$item->total_price}\n";
    echo "\n";
}

// Update job totals
$job->updateTotals();
$job->save();

echo "=== FINAL JOB TOTALS ===\n";
echo "Subtotal Before VAT: {$job->subtotal_before_vat}\n";
echo "VAT Amount ({$job->vat_rate}%): {$job->vat_amount}\n";
echo "Total with VAT: {$job->total_amount}\n";
echo "\nDone!\n";
