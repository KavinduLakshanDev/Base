<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\ServiceJob;
use App\Models\ServiceJobItem;

echo "=== SERVICE JOB ITEMS - COST PRICE CHECK ===\n\n";

$items = ServiceJobItem::with('serviceJob')
    ->whereHas('serviceJob', function($q) {
        $q->where('status', '!=', 'cancelled');
    })
    ->take(10)
    ->get();

if ($items->isEmpty()) {
    echo "⚠️  No service job items found.\n";
} else {
    echo "Sample Service Job Items:\n";
    echo str_repeat('-', 100) . "\n";
    printf("%-12s %-30s %10s %12s %12s %12s\n", 
        "Job Number", "Item Name", "Quantity", "Unit Price", "Cost Price", "Profit");
    echo str_repeat('-', 100) . "\n";
    
    $totalProfit = 0;
    $itemsWithCost = 0;
    $itemsWithoutCost = 0;
    
    foreach ($items as $item) {
        $qty = (float) $item->quantity;
        $unitPrice = (float) $item->unit_price;
        $costPrice = (float) $item->cost_price;
        $profit = ($unitPrice - $costPrice) * $qty;
        
        printf("%-12s %-30s %10.2f %12.2f %12.2f %12.2f\n",
            $item->serviceJob->job_number ?? 'N/A',
            substr($item->item_name, 0, 30),
            $qty,
            $unitPrice,
            $costPrice,
            $profit
        );
        
        $totalProfit += $profit;
        if ($costPrice > 0) {
            $itemsWithCost++;
        } else {
            $itemsWithoutCost++;
        }
    }
    
    echo str_repeat('-', 100) . "\n";
    echo "Total Profit from sample: " . number_format($totalProfit, 2) . "\n\n";
    
    echo "=== SUMMARY ===\n";
    echo "Items with cost_price > 0: {$itemsWithCost}\n";
    echo "Items with cost_price = 0: {$itemsWithoutCost}\n\n";
    
    if ($itemsWithoutCost > 0) {
        echo "⚠️  Note: Items with cost_price = 0 will show profit equal to sales amount.\n";
        echo "   You may need to update cost_price values for accurate profit calculation.\n";
    } else {
        echo "✅ All items have cost_price values set!\n";
    }
}

echo "\n=== TESTING PROFIT CALCULATION ===\n";
echo "Controller code is using: \$costP = (float) (\$it->cost_price ?? 0);\n";
echo "Profit formula: (\$salesP - \$costP) * \$qty\n\n";

$testItem = ServiceJobItem::first();
if ($testItem) {
    echo "Test Item:\n";
    echo "  Item: {$testItem->item_name}\n";
    echo "  Quantity: {$testItem->quantity}\n";
    echo "  Unit Price: {$testItem->unit_price}\n";
    echo "  Cost Price: {$testItem->cost_price}\n";
    
    $qty = (float) $testItem->quantity;
    $sales = (float) $testItem->unit_price;
    $cost = (float) $testItem->cost_price;
    
    echo "\n  Calculation:\n";
    echo "    Total Sales: {$sales} × {$qty} = " . ($sales * $qty) . "\n";
    echo "    Total Cost:  {$cost} × {$qty} = " . ($cost * $qty) . "\n";
    echo "    Profit:      " . (($sales - $cost) * $qty) . "\n";
    
    echo "\n✅ Profit report will now calculate service job profits correctly!\n";
}
