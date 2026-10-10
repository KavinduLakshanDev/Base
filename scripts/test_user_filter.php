<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

// Login as admin (User ID 1)
$admin = \App\Models\User::find(1);
auth()->setUser($admin);
\Illuminate\Support\Facades\Auth::setUser($admin);

echo "=== Testing User Filter Feature ===" . PHP_EOL;
echo "Logged in as: {$admin->first_name} {$admin->last_name} (ID: {$admin->id}, Role: {$admin->role_id})" . PHP_EOL;

// Test 1: Load data for Cashier 1 (User ID 5)
echo PHP_EOL . "Test 1: Load expected data for User ID 5 (vismass_cashier_1)" . PHP_EOL;
$request1 = new \Illuminate\Http\Request([
    'date' => '2026-03-06',
    'section_code' => 'VIS-SEC-002',
    'user_id' => '5', // Cashier 1
]);

$controller = new \App\Http\Controllers\Reports\CashReconciliationController();
$response1 = $controller->getExpectedData($request1);
$data1 = $response1->getData(true);

if (isset($data1['error'])) {
    echo "✗ Error: " . $data1['error'] . PHP_EOL;
} else {
    echo "✓ Success!" . PHP_EOL;
    echo "  Opening Balance: Rs. " . number_format($data1['opening_balance'] ?? 0, 2) . PHP_EOL;
    echo "  Cash Sales: Rs. " . number_format($data1['cash_sales'] ?? 0, 2) . PHP_EOL;
    echo "  Expected Closing: Rs. " . number_format($data1['expected_closing'] ?? 0, 2) . PHP_EOL;
    
    if ($data1['opening_balance'] > 0) {
        echo "  ✓ Opening balance found for cashier 1!" . PHP_EOL;
    } else {
        echo "  ⚠ No opening balance for cashier 1" . PHP_EOL;
    }
}

// Test 2: Load data without user_id (should use admin's own ID)
echo PHP_EOL . "Test 2: Load expected data without user_id (admin's own data)" . PHP_EOL;
$request2 = new \Illuminate\Http\Request([
    'date' => '2026-03-06',
    'section_code' => 'VIS-SEC-002',
]);

$response2 = $controller->getExpectedData($request2);
$data2 = $response2->getData(true);

if (isset($data2['error'])) {
    echo "✗ Error: " . $data2['error'] . PHP_EOL;
} else {
    echo "✓ Success!" . PHP_EOL;
    echo "  Opening Balance: Rs. " . number_format($data2['opening_balance'] ?? 0, 2) . PHP_EOL;
    echo "  Expected Closing: Rs. " . number_format($data2['expected_closing'] ?? 0, 2) . PHP_EOL;
}

// Test 3: Simulate cashier trying to access another user's data
echo PHP_EOL . "Test 3: Simulate cashier trying to access another user's data" . PHP_EOL;
$cashier = \App\Models\User::find(6); // Cashier 2
if ($cashier) {
    auth()->setUser($cashier);
    \Illuminate\Support\Facades\Auth::setUser($cashier);
    
    echo "Logged in as: {$cashier->first_name} {$cashier->last_name} (ID: {$cashier->id}, Role: {$cashier->role_id})" . PHP_EOL;
    
    $request3 = new \Illuminate\Http\Request([
        'date' => '2026-03-06',
        'section_code' => 'VIS-SEC-002',
        'user_id' => '5', // Try to access cashier 1's data
    ]);
    
    $response3 = $controller->getExpectedData($request3);
    $data3 = $response3->getData(true);
    
    if (isset($data3['error'])) {
        echo "✗ Error: " . $data3['error'] . PHP_EOL;
    } else {
        echo "✓ Data loaded" . PHP_EOL;
        echo "  Opening Balance: Rs. " . number_format($data3['opening_balance'] ?? 0, 2) . PHP_EOL;
        
        // Check which user's data was actually loaded
        if (($data3['opening_balance'] ?? 0) > 0) {
            echo "  ⚠ WARNING: Cashier was able to access another user's data (should be blocked)!" . PHP_EOL;
        } else {
            echo "  ✓ Correctly loaded own data (opening balance = 0)" . PHP_EOL;
        }
    }
} else {
    echo "Cashier 2 (User ID 6) not found, skipping test" . PHP_EOL;
}

echo PHP_EOL . "=== All Tests Complete ===" . PHP_EOL;
