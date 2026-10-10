<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "All Models in Database:\n";
echo "=======================\n\n";

$models = App\Models\ProductModel::all();

if ($models->isEmpty()) {
    echo "No models found in database.\n";
} else {
    foreach ($models as $m) {
        echo "ID: {$m->id} | Code: {$m->code} | Name: {$m->name} | Company: {$m->company_code} | Section: {$m->section_code}\n";
    }
}

echo "\n\nModels for VIS001/VIS-SEC-002:\n";
echo "===============================\n";
$visModels = App\Models\ProductModel::where('company_code', 'VIS001')
    ->where('section_code', 'VIS-SEC-002')
    ->get();

foreach ($visModels as $m) {
    echo "Code: {$m->code} | Name: {$m->name}\n";
}
