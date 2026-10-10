<?php
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "All Roles in Database:\n";
echo str_repeat("=", 80) . "\n\n";

$roles = App\Models\Role::all();

if ($roles->count() > 0) {
    foreach ($roles as $role) {
        echo "Slug: " . $role->slug . "\n";
        echo "Name: " . $role->name . "\n";
        echo "Description: " . $role->description . "\n";
        echo "Level: " . $role->level . "\n";
        echo "Permissions: " . $role->permissions->count() . "\n";
        echo str_repeat("-", 80) . "\n";
    }
    echo "\nTotal Roles: " . $roles->count() . "\n";
} else {
    echo "No roles found in database!\n";
}
