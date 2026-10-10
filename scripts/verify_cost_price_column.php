<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== SERVICE_JOB_ITEMS TABLE STRUCTURE ===\n\n";

$columns = DB::select("SHOW COLUMNS FROM service_job_items");

echo "Column Name" . str_repeat(' ', 25) . "Type" . str_repeat(' ', 25) . "Null    Default\n";
echo str_repeat('-', 90) . "\n";

foreach ($columns as $column) {
    printf(
        "%-35s %-30s %-7s %s\n",
        $column->Field,
        $column->Type,
        $column->Null,
        $column->Default ?? 'NULL'
    );
}

echo "\n✅ cost_price column has been added successfully!\n";
