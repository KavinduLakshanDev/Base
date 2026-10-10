<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\ServiceJob;
use App\Models\Section;

echo "=== CHECKING SERVICE JOBS AND SECTIONS ===\n\n";

// Get all sections
echo "Available Sections:\n";
$sections = Section::where('is_active', true)->get();
foreach ($sections as $section) {
    echo "  - {$section->section_code}: {$section->name} (type: {$section->section_type})\n";
}

echo "\n=== SERVICE JOBS ===\n";
$jobs = ServiceJob::with('items')
    ->where('status', '!=', 'cancelled')
    ->take(10)
    ->get();

foreach ($jobs as $job) {
    echo "\nJob #{$job->job_number}\n";
    echo "  Job section_code: " . ($job->section_code ?: 'NULL') . "\n";
    echo "  Status: {$job->status}\n";
    echo "  Items count: " . $job->items->count() . "\n";
    
    foreach ($job->items as $item) {
        echo "    - Item: {$item->item_code} | Item section_code: " . ($item->section_code ?: 'NULL') . "\n";
    }
}

echo "\n=== SECTION CODE ANALYSIS ===\n";
$jobsWithSection = ServiceJob::whereNotNull('section_code')
    ->where('section_code', '!=', '')
    ->where('status', '!=', 'cancelled')
    ->count();
$jobsWithoutSection = ServiceJob::where(function($q) {
    $q->whereNull('section_code')->orWhere('section_code', '');
})->where('status', '!=', 'cancelled')->count();

echo "Jobs WITH section_code: {$jobsWithSection}\n";
echo "Jobs WITHOUT section_code: {$jobsWithoutSection}\n";

echo "\nJob section codes being used:\n";
$usedCodes = ServiceJob::whereNotNull('section_code')
    ->where('section_code', '!=', '')
    ->where('status', '!=', 'cancelled')
    ->distinct()
    ->pluck('section_code');
foreach ($usedCodes as $code) {
    echo "  - {$code}\n";
}
