<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CodeMaster;

echo "=== PRINTER CATEGORY FLAGS ===\n\n";

echo "Vismass CAT001:\n";
$cat = CodeMaster::where('company_code', 'VIS001')
    ->where('concode', 'CAT001')
    ->first();
if ($cat) {
    echo "  is_printer_category: " . ($cat->is_printer_category ? 'TRUE ✓' : 'FALSE ✗') . "\n";
} else {
    echo "  NOT FOUND\n";
}

echo "\nMalibu CAT001:\n";
$cat2 = CodeMaster::where('company_code', 'MAL001')
    ->where('concode', 'CAT001')
    ->first();
if ($cat2) {
    echo "  is_printer_category: " . ($cat2->is_printer_category ? 'TRUE ✗' : 'FALSE ✓') . "\n";
} else {
    echo "  NOT FOUND\n";
}

echo "\n=== ALL CATEGORIES WITH PRINTER FLAG ===\n";
$allCats = CodeMaster::where('conkey', 'CAT')
    ->select('concode', 'cname', 'company_code', 'is_printer_category')
    ->orderBy('company_code')
    ->orderBy('concode')
    ->get();

foreach ($allCats as $c) {
    echo sprintf(
        "%s | %s | %s: %s\n",
        $c->company_code,
        $c->concode,
        $c->cname,
        $c->is_printer_category ? 'PRINTER' : 'STATIONARY'
    );
}
