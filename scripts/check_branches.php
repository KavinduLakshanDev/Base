<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Section;
use App\Models\Company;

echo "=== BRANCHES BY COMPANY ===\n\n";

$malibou = Company::where('company_code', 'MAL001')->first();
$vismass = Company::where('company_code', 'VIS001')->first();

if ($malibou) {
    echo "Malibu (MAL001) Branches:\n";
    $malibuBranches = Section::where('company_code', 'MAL001')->get();
    foreach ($malibuBranches as $b) {
        echo "  - {$b->name} ({$b->section_code}) | is_main_stock: " . ($b->is_main_stock ? 'YES' : 'NO') . "\n";
    }
}

if ($vismass) {
    echo "\nVismass (VIS001) Branches:\n";
    $vismass_branches = Section::where('company_code', 'VIS001')->get();
    foreach ($vismass_branches as $b) {
        echo "  - {$b->name} ({$b->section_code}) | is_main_stock: " . ($b->is_main_stock ? 'YES' : 'NO') . "\n";
    }
}
