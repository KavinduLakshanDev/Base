<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$serial = '74444441111125';

echo "Checking serial number: $serial\n\n";

// Check in sales_transaction_items
$item = DB::table('sales_transaction_items')
    ->where('serial_number', $serial)
    ->first();

if ($item) {
    echo "✓ FOUND in sales_transaction_items:\n";
    echo "  ID: {$item->id}\n";
    echo "  Serial: {$item->serial_number}\n";
    echo "  Brand: {$item->brand}\n";
    echo "  Model: {$item->model}\n";
    echo "  Transaction ID: {$item->sales_transaction_id}\n";
} else {
    echo "✗ NOT FOUND in sales_transaction_items\n";
    
    // List all serials
    echo "\nAll serial numbers in database:\n";
    $allSerials = DB::table('sales_transaction_items')
        ->whereNotNull('serial_number')
        ->where('serial_number', '!=', '')
        ->select('id', 'serial_number', 'brand', 'model')
        ->get();
    
    foreach ($allSerials as $s) {
        echo "  - {$s->serial_number} ({$s->brand} {$s->model})\n";
    }
}
