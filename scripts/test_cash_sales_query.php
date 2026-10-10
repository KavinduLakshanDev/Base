<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\SalesTransaction;

echo "=== Testing Cash Sales Query ===" . PHP_EOL;

$user = User::find(1);
if (!$user) {
    echo "User ID 1 not found!" . PHP_EOL;
    exit(1);
}

echo "User: {$user->username} (ID: {$user->id})" . PHP_EOL;
echo "Section: {$user->section_code}" . PHP_EOL;

$date = '2026-03-06';
$sectionCode = $user->section_code;

echo PHP_EOL . "Testing cash sales query..." . PHP_EOL;
echo "Date: {$date}" . PHP_EOL;
echo "Section: {$sectionCode}" . PHP_EOL;
echo "Cashier ID: {$user->id}" . PHP_EOL;

try {
    // Test the query structure
    $sales = SalesTransaction::where('cashier_id', $user->id)
        ->where('section_code', $sectionCode)
        ->whereDate('transaction_date', $date)
        ->whereNotNull('payment_details')
        ->where('status', '!=', 'cancelled')
        ->get();

    echo PHP_EOL . "✓ Query executed successfully!" . PHP_EOL;
    echo "Sales transactions found: " . $sales->count() . PHP_EOL;
    
    $totalCash = (float) $sales->sum(fn($s) => (float) ($s->payment_details['cash'] ?? 0));
    echo "Total cash from sales: Rs. " . number_format($totalCash, 2) . PHP_EOL;
    
    if ($sales->count() > 0) {
        echo PHP_EOL . "Sample transaction:" . PHP_EOL;
        $sample = $sales->first();
        echo "  Invoice: {$sample->invoice_no}" . PHP_EOL;
        echo "  Date: {$sample->transaction_date}" . PHP_EOL;
        echo "  Total: Rs. " . number_format($sample->total_amount, 2) . PHP_EOL;
        echo "  Cash payment: Rs. " . number_format($sample->payment_details['cash'] ?? 0, 2) . PHP_EOL;
        echo "  Status: {$sample->status}" . PHP_EOL;
    }
    
} catch (\Exception $e) {
    echo "✗ Query failed: " . $e->getMessage() . PHP_EOL;
    exit(1);
}

echo PHP_EOL . "=== Test Complete ===" . PHP_EOL;
