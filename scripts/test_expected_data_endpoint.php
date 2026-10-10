<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

// Simulate an authenticated request
$user = \App\Models\User::find(1);
if (!$user) {
    echo "User not found!" . PHP_EOL;
    exit(1);
}

// Set up authentication
auth()->setUser($user);
\Illuminate\Support\Facades\Auth::setUser($user);

echo "=== Testing getExpectedData Endpoint ===" . PHP_EOL;
echo "User: {$user->username} (ID: {$user->id})" . PHP_EOL;
echo "Section: {$user->section_code}" . PHP_EOL;

// Create a mock request
$request = new \Illuminate\Http\Request([
    'date' => '2026-03-06',
    'section_code' => $user->section_code
]);

// Call the controller method
$controller = new \App\Http\Controllers\Reports\CashReconciliationController();

try {
    $response = $controller->getExpectedData($request);
    $data = $response->getData(true);
    
    echo PHP_EOL . "✓ Endpoint executed successfully!" . PHP_EOL;
    
    if (isset($data['error'])) {
        echo "✗ Error: " . $data['error'] . PHP_EOL;
        exit(1);
    }
    
    echo PHP_EOL . "Expected Data:" . PHP_EOL;
    echo "  Opening Balance:  Rs. " . number_format($data['opening_balance'] ?? 0, 2) . PHP_EOL;
    echo "  Cash Sales:       Rs. " . number_format($data['cash_sales'] ?? 0, 2) . PHP_EOL;
    echo "  Credit Payments:  Rs. " . number_format($data['credit_payments'] ?? 0, 2) . PHP_EOL;
    echo "  Expenses:         Rs. " . number_format($data['expenses'] ?? 0, 2) . PHP_EOL;
    echo "  ─────────────────────────────────" . PHP_EOL;
    echo "  Expected Closing: Rs. " . number_format($data['expected_closing'] ?? 0, 2) . PHP_EOL;
    
    if (isset($data['existing_reconciliation']) && $data['existing_reconciliation']) {
        echo PHP_EOL . "ℹ Note: Reconciliation already exists for this date." . PHP_EOL;
    }
    
} catch (\Exception $e) {
    echo PHP_EOL . "✗ Endpoint failed: " . $e->getMessage() . PHP_EOL;
    echo "Stack trace:" . PHP_EOL;
    echo $e->getTraceAsString() . PHP_EOL;
    exit(1);
}

echo PHP_EOL . "=== Test Complete ===" . PHP_EOL;
