<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Sample Model Codes:\n";
echo "==================\n\n";

$models = App\Models\ProductModel::with('brand')->take(10)->get();

if ($models->isEmpty()) {
    echo "No models found in database.\n";
} else {
    foreach ($models as $m) {
        $brandCode = $m->brand ? $m->brand->code : 'N/A';
        $brandName = $m->brand ? $m->brand->name : 'N/A';
        echo "Code: {$m->code} | Model: {$m->name} | Brand Code: {$brandCode} | Brand Name: {$brandName}\n";
    }
}
