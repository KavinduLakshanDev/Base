<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\ServiceJobController;

echo "=== TESTING BACKEND API ===\n";
echo "Serial: 74444441111125\n\n";

$controller = new ServiceJobController();
$request = new Request(['serial' => '74444441111125']);

$response = $controller->getCustomerByDevice($request);
$data = json_decode($response->getContent(), true);

echo "Status Code: " . $response->getStatusCode() . "\n\n";

if ($response->getStatusCode() == 200) {
    echo "✓ SUCCESS\n\n";
    
    echo "Customer Data:\n";
    echo "  AccKy: " . ($data['customer']['AccKy'] ?? 'NULL') . "\n";
    echo "  Name: " . ($data['customer']['customer_name'] ?? 'NULL') . "\n";
    echo "  Phone: " . ($data['customer']['customer_phone'] ?? 'NULL') . "\n";
    echo "  Email: " . ($data['customer']['customer_email'] ?? 'NULL') . "\n";
    echo "  Address: " . ($data['customer']['customer_address'] ?? 'NULL') . "\n\n";
    
    echo "Device Data:\n";
    echo "  Brand: " . ($data['device_brand'] ?? 'NULL') . "\n";
    echo "  Model: " . ($data['device_model'] ?? 'NULL') . "\n";
    echo "  Serial: " . ($data['device_serial'] ?? 'NULL') . "\n";
    echo "  Warranty: " . ($data['device_warranty'] ?? 'NULL') . "\n\n";
    
    echo "Sale Date: " . ($data['sale_date'] ?? 'NULL') . "\n\n";
    
    if (!empty($data['address'])) {
        echo "Address Record:\n";
        echo "  TP1: " . ($data['address']['TP1'] ?? 'NULL') . "\n";
        echo "  TP2: " . ($data['address']['TP2'] ?? 'NULL') . "\n";
        echo "  TP3: " . ($data['address']['TP3'] ?? 'NULL') . "\n";
        echo "  Email: " . ($data['address']['Email'] ?? 'NULL') . "\n";
        echo "  Address: " . ($data['address']['Address'] ?? 'NULL') . "\n";
    }
} else {
    echo "✗ ERROR\n";
    echo json_encode($data, JSON_PRETTY_PRINT);
}
