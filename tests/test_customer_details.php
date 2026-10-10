<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\AccMas;
use App\Models\Address;

echo "Testing Customer Details Endpoint\n";
echo "==================================\n\n";

// Test AccKy 1
$AccKy = 1;
echo "Testing AccKy: {$AccKy}\n";

$customer = AccMas::where('AccKy', $AccKy)->first();
if ($customer) {
    echo "✓ Customer found: {$customer->AccNm}\n";
    echo "  AccCd: {$customer->AccCd}\n";
    echo "  AccTyp: {$customer->AccTyp}\n";
} else {
    echo "✗ Customer not found\n";
}

$address = Address::where('AccKy', $AccKy)->orderBy('AdrKy', 'desc')->first();
if ($address) {
    echo "✓ Address found (AdrKy: {$address->AdrKy})\n";
    echo "  TP1: " . ($address->TP1 ?? 'NULL') . "\n";
    echo "  Email: " . ($address->Email ?? 'NULL') . "\n";
    echo "  Address: " . ($address->Address ?? 'NULL') . "\n";
} else {
    echo "✗ Address not found\n";
}

echo "\nAll addresses for AccKy {$AccKy}:\n";
$allAddresses = Address::where('AccKy', $AccKy)->get();
echo "Count: " . $allAddresses->count() . "\n";
foreach ($allAddresses as $addr) {
    echo "  - AdrKy: {$addr->AdrKy}, AdrTypKy: " . ($addr->AdrTypKy ?? 'NULL') . ", TP1: " . ($addr->TP1 ?? 'NULL') . "\n";
}

echo "\n✓ Test completed successfully\n";
