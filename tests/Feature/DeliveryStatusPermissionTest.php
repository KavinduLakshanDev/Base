<?php

use App\Models\Company;
use App\Models\Delivery;
use App\Models\DeliveryRoute;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('user without deliveries.update_status or deliveries.edit cannot update delivery status', function () {
    $company = Company::create(['company_code' => 'TEST002', 'name' => 'Test Co 2', 'address' => 'Addr', 'phone' => '000', 'email' => 'a@a.com', 'password' => bcrypt('pw'), 'is_active' => true]);

    $role = Role::create(['name' => 'NoPerms', 'slug' => 'no-perms', 'level' => 'user', 'company_code' => 'TEST002']);

    $user = User::create([
        'company_code' => 'TEST002',
        'first_name' => 'No',
        'last_name' => 'Perm',
        'email' => 'noperm@example.com',
        'password' => bcrypt('password'),
        'role_id' => $role->id,
        'is_active' => true,
    ]);

    $route = DeliveryRoute::create(['company_code' => 'TEST002', 'name' => 'R1', 'is_active' => true]);

    $delivery = Delivery::create([
        'delivery_number' => 'DEL-TEST-STAT-1',
        'customer_name' => 'C',
        'customer_address' => 'A',
        'customer_phone' => '123',
        'delivery_route_id' => $route->id,
        'company_code' => 'TEST002',
        'status' => 'assigned',
    ]);

    $this->actingAs($user);

    $response = $this->patch("/deliveries/{$delivery->id}/status", ['status' => 'delivering']);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    $delivery->refresh();
    expect($delivery->status)->toBe('assigned');
});

test('user with deliveries.update_status can update delivery status', function () {
    $company = Company::create(['company_code' => 'TEST003', 'name' => 'Test Co 3', 'address' => 'Addr', 'phone' => '000', 'email' => 'b@b.com', 'password' => bcrypt('pw'), 'is_active' => true]);

    $permission = Permission::create(['name' => 'Update Delivery Status', 'slug' => 'deliveries.update_status', 'description' => 'Can update delivery status', 'uuid' => (string) \Illuminate\Support\Str::uuid()]);

    $role = Role::create(['name' => 'StatusUpdater', 'slug' => 'status-updater', 'level' => 'user', 'company_code' => 'TEST003']);
    $role->permissions()->attach($permission->id);

    $user = User::create([
        'company_code' => 'TEST003',
        'first_name' => 'Status',
        'last_name' => 'User',
        'email' => 'statususer@example.com',
        'password' => bcrypt('password'),
        'role_id' => $role->id,
        'is_active' => true,
    ]);

    $route = DeliveryRoute::create(['company_code' => 'TEST003', 'name' => 'R1', 'is_active' => true]);

    $delivery = Delivery::create([
        'delivery_number' => 'DEL-TEST-STAT-2',
        'customer_name' => 'C2',
        'customer_address' => 'A2',
        'customer_phone' => '456',
        'delivery_route_id' => $route->id,
        'company_code' => 'TEST003',
        'status' => 'assigned',
    ]);

    $this->actingAs($user);

    // sanity check: role should include the permission
    expect($user->hasPermission('deliveries.update_status'))->toBeTrue();

    $response = $this->patch("/deliveries/{$delivery->id}/status", ['status' => 'delivering']);

    $response->assertRedirect();

    $delivery->refresh();
    expect($delivery->status)->toBe('delivering');
});
