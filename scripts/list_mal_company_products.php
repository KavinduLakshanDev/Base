<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\\Contracts\\Console\\Kernel')->bootstrap();
use App\Models\Product;
use Illuminate\Support\Facades\DB;

echo "Products with company_code = 'MAL001'\n\n";
$products = DB::table('itemmaster')
    ->where('company_code', 'MAL001')
    ->select('ItmKy','ItemCode','ItmNm','company_code','section_code','fInAct','available_business_units')
    ->orderByDesc('ItmKy')
    ->limit(50)
    ->get();

if ($products->isEmpty()) {
    echo "No products found for MAL001.\n";
    exit(0);
}

foreach ($products as $p) {
    echo "ID: {$p->ItmKy}\n";
    echo " Code: {$p->ItemCode}\n";
    echo " Name: {$p->ItmNm}\n";
    echo " Company: {$p->company_code}\n";
    echo " Section: {$p->section_code}\n";
    echo " Inactive: " . ($p->fInAct ? 'YES' : 'NO') . "\n";
    echo " available_business_units: {$p->available_business_units}\n";
    echo "---\n";
}
