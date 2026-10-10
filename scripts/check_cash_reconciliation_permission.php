<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

echo "=== Checking Cash Reconciliation Permission ===" . PHP_EOL;

// Check if permission exists
$permission = Permission::where('slug', 'reports.cash_reconciliation')->first();

if ($permission) {
    echo "✓ Permission found: {$permission->slug} (ID: {$permission->id})" . PHP_EOL;
    echo "  Name: {$permission->name}" . PHP_EOL;
    
    // Check which roles have this permission
    $roles = DB::table('role_permissions')
        ->join('roles', 'roles.id', '=', 'role_permissions.role_id')
        ->where('role_permissions.permission_id', $permission->id)
        ->select('roles.id', 'roles.name')
        ->get();
    
    if ($roles->count() > 0) {
        echo PHP_EOL . "Roles with this permission:" . PHP_EOL;
        foreach ($roles as $role) {
            echo "  - {$role->name} (ID: {$role->id})" . PHP_EOL;
        }
    } else {
        echo PHP_EOL . "⚠ WARNING: No roles have this permission!" . PHP_EOL;
        echo "Adding permission to Super Admin (role 1) and Company Admin (role 2)..." . PHP_EOL;
        
        // Add to Super Admin (role 1)
        DB::table('role_permissions')->insertOrIgnore([
            'permission_id' => $permission->id,
            'role_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        // Add to Company Admin (role 2)
        DB::table('role_permissions')->insertOrIgnore([
            'permission_id' => $permission->id,
            'role_id' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        echo "✓ Permission assigned to Super Admin and Company Admin roles." . PHP_EOL;
    }
} else {
    echo "✗ Permission NOT FOUND! Creating it now..." . PHP_EOL;
    
    $permission = Permission::create([
        'name' => 'View Cash Reconciliation Reports',
        'slug' => 'reports.cash_reconciliation',
        'description' => 'View and manage cash reconciliation reports',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    
    echo "✓ Permission created (ID: {$permission->id})" . PHP_EOL;
    
    // Assign to Super Admin and Company Admin
    DB::table('role_permissions')->insert([
        [
            'permission_id' => $permission->id,
            'role_id' => 1, // Super Admin
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'permission_id' => $permission->id,
            'role_id' => 2, // Company Admin
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);
    
    echo "✓ Permission assigned to Super Admin (role 1) and Company Admin (role 2)." . PHP_EOL;
}

echo PHP_EOL . "=== Check Complete ===" . PHP_EOL;
