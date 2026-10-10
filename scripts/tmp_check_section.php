<?php

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Section;
use Illuminate\Support\Facades\DB;

$section = Section::where('name', 'Vismass shop stock')->first();
$code = $section ? $section->section_code : null;
echo "section code: " . ($code ?: '<none>') . "\n";

if ($code) {
    $count = DB::table('stock_in_hand')
        ->where('section_code', $code)
        ->whereNotNull('serial_number')
        ->where('serial_number', '!=', '')
        ->whereRaw('(COALESCE(Qty,0)+COALESCE(FreeQty,0))>0')
        ->count();
    echo "count: $count\n";
}
