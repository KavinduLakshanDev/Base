<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Checking Sections Table:\n";
echo "========================\n\n";

$sections = \App\Models\Section::select('section_code', 'name', 'is_active')
    ->get();

echo "Total sections found: " . $sections->count() . "\n\n";

foreach ($sections as $section) {
    echo "Section Code: " . $section->section_code . "\n";
    echo "Name: " . $section->name . "\n";
    echo "Is Active: " . ($section->is_active ? 'Yes' : 'No') . "\n";
    echo "---\n";
}

echo "\nActive sections only:\n";
$activeSections = \App\Models\Section::where('is_active', true)
    ->select('section_code', 'name')
    ->get();

echo "Total active sections: " . $activeSections->count() . "\n\n";

foreach ($activeSections as $section) {
    echo "- {$section->name} ({$section->section_code})\n";
}
