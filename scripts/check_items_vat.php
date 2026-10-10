<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Get the service job items
$job = \App\Models\ServiceJob::where('job_number', 'SJ000005')->first();

if (!$job) {
    echo "Job not found\n";
    exit;
}

echo "=== CHECKING ITEMS VAT STATUS ===\n\n";

foreach ($job->items as $item) {
    echo "Item: {$item->item_name}\n";
    echo "ItmKy: " . ($item->ItmKy ?? 'NULL') . "\n";
    
    if ($item->ItmKy) {
        $itemMaster = \App\Models\ItemMaster::where('ItmKy', $item->ItmKy)->first();
        if ($itemMaster) {
            echo "Found in ItemMaster:\n";
            echo "  - VATItem: " . ($itemMaster->VATItem ? 'YES (1)' : 'NO (0)') . "\n";
            echo "  - Item Name: {$itemMaster->ItmNam}\n";
            
            // Update the item to have VAT
            echo "\nUpdating ItemMaster to include VAT...\n";
            $itemMaster->VATItem = true;
            $itemMaster->save();
            echo "ItemMaster updated!\n";
        } else {
            echo "NOT found in ItemMaster\n";
        }
    } else {
        echo "No ItmKy - item not linked to ItemMaster\n";
    }
    echo "\n" . str_repeat('-', 50) . "\n\n";
}
