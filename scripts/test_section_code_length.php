<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Testing Section Code Length ===" . PHP_EOL;

// Check the column definition
echo "Checking cash_reconciliations table structure..." . PHP_EOL;
$result = DB::select("SHOW COLUMNS FROM cash_reconciliations WHERE Field = 'section_code'");

if (!empty($result)) {
    $column = $result[0];
    echo "✓ Column 'section_code' found" . PHP_EOL;
    echo "  Type: {$column->Type}" . PHP_EOL;
    echo "  Null: {$column->Null}" . PHP_EOL;
    
    // Extract the length from Type (e.g., "varchar(50)")
    if (preg_match('/varchar\((\d+)\)/', $column->Type, $matches)) {
        $length = $matches[1];
        echo "  Length: {$length} characters" . PHP_EOL;
        
        if ($length >= 11) {
            echo "  ✓ Length is sufficient for section codes like 'VIS-SEC-002' (11 chars)" . PHP_EOL;
        } else {
            echo "  ✗ Length is too short! Need at least 11 characters." . PHP_EOL;
        }
    }
} else {
    echo "✗ Column 'section_code' not found!" . PHP_EOL;
}

// Test a sample section code
$sectionCode = 'VIS-SEC-002';
echo PHP_EOL . "Testing section code: '{$sectionCode}'" . PHP_EOL;
echo "  Length: " . strlen($sectionCode) . " characters" . PHP_EOL;

// Simulate the validation
$validationRules = [
    'max:10' => strlen($sectionCode) <= 10,
    'max:20' => strlen($sectionCode) <= 20,
    'max:50' => strlen($sectionCode) <= 50,
];

foreach ($validationRules as $rule => $passes) {
    $status = $passes ? '✓ PASS' : '✗ FAIL';
    echo "  {$status}: Validation rule '{$rule}'" . PHP_EOL;
}

echo PHP_EOL . "=== Test Complete ===" . PHP_EOL;
