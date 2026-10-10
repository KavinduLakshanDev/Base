<?php

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Reports\PrinterStockReportController;

// Login as first user (adjust ID if needed)
$user = \App\Models\User::first();
if (!$user) {
    echo "No user found\n";
    exit(1);
}
Auth::login($user);

// Create request with optional parameters and Inertia header so the response is JSON
$request = Request::create(
    '/reports/printer-stock',
    'GET',
    [
        // 'section' => 'all',
        // 'search' => '',
    ],
    [],
    [],
    ['HTTP_X_INERTIA' => 'true']
);

$controller = new PrinterStockReportController();
$response = $controller->index($request);

$httpResponse = $response->toResponse($request);
$content = $httpResponse->getContent();

echo "HTTP status: " . $httpResponse->getStatusCode() . "\n";

$data = json_decode($content, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo "Response keys: " . implode(', ', array_keys($data)) . "\n";
    if (isset($data['props']['stockData'])) {
        $sd = $data['props']['stockData'];
        echo "stockData keys: " . implode(', ', array_keys($sd)) . "\n";
        echo "stockData data count: " . count($sd['data'] ?? []) . "\n";
        echo "stockData meta: " . json_encode($sd['meta'] ?? null) . "\n";
        echo "stockData links: " . json_encode($sd['links'] ?? null) . "\n";
    }
} else {
    echo "Invalid JSON response\n";
    echo $content;
}
