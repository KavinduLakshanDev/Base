<?php
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Cross-Company Transfer Permission - Full Details:\n";
echo str_repeat("=", 80) . "\n\n";

// Get the permission by checking both name and slug
$permissions = App\Models\Permission::where('name', 'Cross-Company Stock Transfer')
    ->orWhere('name', 'like', '%Cross-Company%')
    ->get();

if ($permissions->count() > 0) {
    foreach ($permissions as $perm) {
        echo "ID: " . $perm->id . "\n";
        echo "Name: " . $perm->name . "\n";
        
        // Check if slug field exists
        if (property_exists($perm, 'slug') || array_key_exists('slug', $perm->getAttributes())) {
            echo "Slug: " . ($perm->slug ?? 'NULL') . "\n";
        } else {
            echo "Slug field: NOT FOUND\n";
        }
        
        echo "Description: " . ($perm->description ?? 'N/A') . "\n";
        echo "Assigned to Roles: " . $perm->roles->pluck('name')->implode(', ') . "\n";
        
        // Show all attributes
        echo "\nAll Attributes:\n";
        foreach ($perm->getAttributes() as $key => $value) {
            echo "  - {$key}: " . ($value ?? 'NULL') . "\n";
        }
        
        echo str_repeat("-", 80) . "\n";
    }
} else {
    echo "No cross-company permissions found!\n";
}
