<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;

echo "=== Checking User Access ===" . PHP_EOL;

// Check user 1 (the current logged-in user based on earlier context)
$user = User::with('role.permissions')->find(1);

if ($user) {
    echo "User: {$user->username} (ID: {$user->id})" . PHP_EOL;
    echo "Role: {$user->role->name} (ID: {$user->role_id})" . PHP_EOL;
    echo "Company: {$user->company_code}" . PHP_EOL;
    echo "Section: " . ($user->section_code ?? 'N/A') . PHP_EOL;
    
    // Check if user has the permission
    $hasPermission = $user->hasPermission('reports.cash_reconciliation');
    echo PHP_EOL . "Has 'reports.cash_reconciliation' permission: " . ($hasPermission ? '✓ YES' : '✗ NO') . PHP_EOL;
    
    if (!$hasPermission) {
        echo PHP_EOL . "Role permissions:" . PHP_EOL;
        foreach ($user->role->permissions as $perm) {
            echo "  - {$perm->slug}" . PHP_EOL;
        }
    } else {
        echo PHP_EOL . "✓ User can access Cash Reconciliation form!" . PHP_EOL;
    }
} else {
    echo "User ID 1 not found!" . PHP_EOL;
}
