<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

// Login as cashier 1
$user = \App\Models\User::find(5); // vismass_cashier_1
if (!$user) {
    echo "User ID 5 not found!" . PHP_EOL;
    exit(1);
}

auth()->setUser($user);
\Illuminate\Support\Facades\Auth::setUser($user);

echo "=== Testing Cash Reconciliation Save ===" . PHP_EOL;
echo "User: {$user->first_name} {$user->last_name} (ID: {$user->id})" . PHP_EOL;
echo "Section: {$user->section_code}" . PHP_EOL;
echo "Section code length: " . strlen($user->section_code) . " characters" . PHP_EOL;

// First, delete any existing reconciliation for today
$existing = \App\Models\CashReconciliation::where('user_id', $user->id)
    ->where('reconciliation_date', '2026-03-06')
    ->first();

if ($existing) {
    echo PHP_EOL . "Deleting existing reconciliation (ID: {$existing->id})..." . PHP_EOL;
    $existing->delete();
}

// Simulate the request payload
$payload = [
    'section_code' => $user->section_code, // 'VIS-SEC-002' - 11 chars
    'reconciliation_date' => '2026-03-06',
    'notes_5000' => 2,
    'notes_2000' => 5,
    'notes_1000' => 10,
    'notes_500' => 5,
    'notes_100' => 10,
    'notes_50' => 5,
    'notes_20' => 10,
    'coins' => 50.50,
    'actual_cash' => 24250.50,
    'opening_balance' => 15000.00,
    'cash_sales' => 0.00,
    'credit_payments' => 0.00,
    'expenses' => 0.00,
    'expected_closing' => 15000.00,
    'variance' => 9250.50,
    'notes' => 'Test reconciliation with 11-character section code',
];

echo PHP_EOL . "Test payload:" . PHP_EOL;
echo "  Section Code: '{$payload['section_code']}' (" . strlen($payload['section_code']) . " chars)" . PHP_EOL;
echo "  Date: {$payload['reconciliation_date']}" . PHP_EOL;
echo "  Actual Cash: Rs. " . number_format($payload['actual_cash'], 2) . PHP_EOL;

// Create a mock request
$request = \Illuminate\Http\Request::create(
    '/reports/cash-reconciliation',
    'POST',
    $payload
);

// Set up request for controller
app()->instance('request', $request);

try {
    $controller = new \App\Http\Controllers\Reports\CashReconciliationController();
    $response = $controller->store($request);
    
    $statusCode = $response->getStatusCode();
    $data = json_decode($response->getContent(), true);
    
    echo PHP_EOL . "Response Status: {$statusCode}" . PHP_EOL;
    
    if ($statusCode === 200 || $statusCode === 201) {
        echo "✓ SUCCESS! Reconciliation saved." . PHP_EOL;
        if (isset($data['reconciliation'])) {
            echo "  ID: {$data['reconciliation']['id']}" . PHP_EOL;
            echo "  Section: {$data['reconciliation']['section_code']}" . PHP_EOL;
            echo "  Status: {$data['reconciliation']['status']}" . PHP_EOL;
        }
    } else {
        echo "✗ FAILED!" . PHP_EOL;
        if (isset($data['error'])) {
            echo "  Error: {$data['error']}" . PHP_EOL;
        }
        if (isset($data['message'])) {
            echo "  Message: {$data['message']}" . PHP_EOL;
        }
        if (isset($data['errors'])) {
            echo "  Validation Errors:" . PHP_EOL;
            foreach ($data['errors'] as $field => $messages) {
                echo "    - {$field}: " . implode(', ', $messages) . PHP_EOL;
            }
        }
    }
} catch (\Exception $e) {
    echo "✗ Exception: " . $e->getMessage() . PHP_EOL;
    echo "  File: {$e->getFile()}:{$e->getLine()}" . PHP_EOL;
}

echo PHP_EOL . "=== Test Complete ===" . PHP_EOL;
