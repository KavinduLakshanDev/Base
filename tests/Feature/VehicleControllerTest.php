<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('company admin can create vehicle and assign sales rep', function () {
    $companyCode = 'TV001';

    // make sure sales_rep role exists
    $salesRole = Role::firstOrCreate([
        'slug' => 'sales_rep'
    ], [
        'name' => 'Sales Representative',
        'level' => 'section_user',
    ]);

    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);

    // create a sales rep in same company
    $rep = User::factory()->create(['company_code' => $companyCode, 'role_id' => $salesRole->id, 'is_active' => true]);

    $this->actingAs($admin);

    $response = $this->post('/deliveries/vehicles', [
        'name' => 'Van Test',
        'registration_no' => 'VT-100',
        'assigned_user_id' => $rep->id,
    ]);

    $response->assertRedirect(route('delivery.vehicles.index'));

    $this->assertDatabaseHas('vehicles', [
        'name' => 'Van Test',
        'registration_no' => 'VT-100',
        'assigned_user_id' => $rep->id,
        'company_code' => $companyCode,
    ]);
});


test('cannot assign a user from another company or a non-sales-rep user', function () {
    $companyCode = 'TV002';
    $otherCompany = 'OTHER';

    $salesRole = Role::firstOrCreate([
        'slug' => 'sales_rep'
    ], [
        'name' => 'Sales Representative',
        'level' => 'section_user',
    ]);

    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);

    // user from another company
    $external = User::factory()->create(['company_code' => $otherCompany]);

    // user in same company but not sales rep
    $nonRep = User::factory()->create(['company_code' => $companyCode, 'role_id' => null]);

    $this->actingAs($admin);

    // attempt assign external user
    $res1 = $this->post('/deliveries/vehicles', [
        'name' => 'Van Bad 1',
        'assigned_user_id' => $external->id,
    ]);
    $res1->assertSessionHasErrors('assigned_user_id');

    // attempt assign non-sales-rep user from same company
    $res2 = $this->post('/deliveries/vehicles', [
        'name' => 'Van Bad 2',
        'assigned_user_id' => $nonRep->id,
    ]);
    $res2->assertSessionHasErrors('assigned_user_id');

    // ensure no vehicles created
    $this->assertDatabaseMissing('vehicles', ['name' => 'Van Bad 1']);
    $this->assertDatabaseMissing('vehicles', ['name' => 'Van Bad 2']);
});


test('company admin can update vehicle and assign sales rep', function () {
    $companyCode = 'TV003';

    $salesRole = Role::firstOrCreate([
        'slug' => 'sales_rep'
    ], [
        'name' => 'Sales Representative',
        'level' => 'section_user',
    ]);

    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);
    $vehicle = \App\Models\Vehicle::create(['name' => 'Van U', 'company_code' => $companyCode]);

    // create a sales rep in same company
    $rep = User::factory()->create(['company_code' => $companyCode, 'role_id' => $salesRole->id, 'is_active' => true]);

    $this->actingAs($admin);

    $response = $this->put("/deliveries/vehicles/{$vehicle->id}", [
        'name' => 'Van U Updated',
        'assigned_user_id' => $rep->id,
    ]);

    $response->assertRedirect(route('delivery.vehicles.index'));

    $this->assertDatabaseHas('vehicles', [
        'id' => $vehicle->id,
        'name' => 'Van U Updated',
        'assigned_user_id' => $rep->id,
    ]);
});


test('cannot assign the same sales rep to multiple vehicles', function () {
    $companyCode = 'TV005';

    $salesRole = Role::firstOrCreate(['slug' => 'sales_rep'], ['name' => 'Sales Representative', 'level' => 'section_user']);
    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);
    $rep = User::factory()->create(['company_code' => $companyCode, 'role_id' => $salesRole->id, 'is_active' => true]);

    // existing vehicle already assigned to rep
    $existing = \App\Models\Vehicle::create(['name' => 'Existing Van', 'company_code' => $companyCode, 'assigned_user_id' => $rep->id]);

    $this->actingAs($admin);

    $res = $this->post('/deliveries/vehicles', [
        'name' => 'New Van',
        'assigned_user_id' => $rep->id,
    ]);

    $res->assertSessionHasErrors('assigned_user_id');
    $this->assertDatabaseMissing('vehicles', ['name' => 'New Van']);
});

test('cannot update a vehicle to use a sales rep already assigned to another vehicle', function () {
    $companyCode = 'TV006';

    $salesRole = Role::firstOrCreate(['slug' => 'sales_rep'], ['name' => 'Sales Representative', 'level' => 'section_user']);
    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);
    $rep = User::factory()->create(['company_code' => $companyCode, 'role_id' => $salesRole->id, 'is_active' => true]);

    // vehicle A already has the rep
    $vehicleA = \App\Models\Vehicle::create(['name' => 'Van A', 'company_code' => $companyCode, 'assigned_user_id' => $rep->id]);
    // vehicle B is unassigned
    $vehicleB = \App\Models\Vehicle::create(['name' => 'Van B', 'company_code' => $companyCode]);

    $this->actingAs($admin);

    $res = $this->put("/deliveries/vehicles/{$vehicleB->id}", [
        'name' => 'Van B',
        'assigned_user_id' => $rep->id,
    ]);

    $res->assertSessionHasErrors('assigned_user_id');
});

test('cannot update vehicle to assign external or non-sales-rep user', function () {
    $companyCode = 'TV004';
    $otherCompany = 'OTHERX';

    $salesRole = Role::firstOrCreate([
        'slug' => 'sales_rep'
    ], [
        'name' => 'Sales Representative',
        'level' => 'section_user',
    ]);

    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);
    $vehicle = \App\Models\Vehicle::create(['name' => 'Van U2', 'company_code' => $companyCode]);

    // user from another company
    $external = User::factory()->create(['company_code' => $otherCompany]);

    // user in same company but not sales rep
    $nonRep = User::factory()->create(['company_code' => $companyCode, 'role_id' => null]);

    $this->actingAs($admin);

    // attempt assign external user
    $res1 = $this->put("/deliveries/vehicles/{$vehicle->id}", [
        'name' => 'Bad Update 1',
        'assigned_user_id' => $external->id,
    ]);
    $res1->assertSessionHasErrors('assigned_user_id');

    // attempt assign non-sales-rep user from same company
    $res2 = $this->put("/deliveries/vehicles/{$vehicle->id}", [
        'name' => 'Bad Update 2',
        'assigned_user_id' => $nonRep->id,
    ]);
    $res2->assertSessionHasErrors('assigned_user_id');

    // ensure no vehicles created/updated incorrectly
    $this->assertDatabaseMissing('vehicles', ['name' => 'Bad Update 1']);
    $this->assertDatabaseMissing('vehicles', ['name' => 'Bad Update 2']);
});


test('database enforces unique sales-rep assignment for vehicles', function () {
    $companyCode = 'TVDB1';

    $salesRole = Role::firstOrCreate(['slug' => 'sales_rep'], ['name' => 'Sales Representative', 'level' => 'section_user']);
    $rep = User::factory()->create(['company_code' => $companyCode, 'role_id' => $salesRole->id, 'is_active' => true]);

    // insert first vehicle with assigned rep
    \App\Models\Vehicle::create(['name' => 'DB Van 1', 'company_code' => $companyCode, 'assigned_user_id' => $rep->id]);

    // DB-level uniqueness should reject the second insert (QueryException)
    $this->expectException(\Illuminate\Database\QueryException::class);

    \App\Models\Vehicle::create(['name' => 'DB Van 2', 'company_code' => $companyCode, 'assigned_user_id' => $rep->id]);
});
