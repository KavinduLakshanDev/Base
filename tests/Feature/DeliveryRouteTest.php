<?php

use App\Models\Role;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('company admin can create delivery route and assign sales reps', function () {
    $companyCode = 'RT001';
    Company::factory()->create(['company_code' => $companyCode]);

    $salesRole = Role::firstOrCreate(['slug' => 'sales_rep'], ['name' => 'Sales Rep', 'level' => 'section_user']);

    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);

    $rep1 = User::factory()->create(['company_code' => $companyCode, 'role_id' => $salesRole->id]);
    $rep2 = User::factory()->create(['company_code' => $companyCode, 'role_id' => $salesRole->id]);

    $this->actingAs($admin);

    $response = $this->post('/deliveries/routes', [
        'name' => 'Test Route A',
        'areas' => ['Area 1', 'Area 2'],
        'description' => 'Test route',
        'user_ids' => [$rep1->id, $rep2->id],
    ]);

    $response->assertRedirect(route('delivery.routes.index'));

    $this->assertDatabaseHas('delivery_routes', ['name' => 'Test Route A', 'company_code' => $companyCode]);

    $routeId = \DB::table('delivery_routes')->where('name', 'Test Route A')->value('id');

    $this->assertDatabaseHas('delivery_route_user', ['delivery_route_id' => $routeId, 'user_id' => $rep1->id]);
    $this->assertDatabaseHas('delivery_route_user', ['delivery_route_id' => $routeId, 'user_id' => $rep2->id]);
});

test('cannot assign external or non-sales-rep users when creating route', function () {
    $companyCode = 'RT002';
    Company::factory()->create(['company_code' => $companyCode]);
    $other = 'OUT';

    $salesRole = Role::firstOrCreate(['slug' => 'sales_rep'], ['name' => 'Sales Rep', 'level' => 'section_user']);

    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);

    $external = User::factory()->create(['company_code' => $other]);
    $nonRep = User::factory()->create(['company_code' => $companyCode, 'role_id' => null]);

    $this->actingAs($admin);

    $res = $this->post('/deliveries/routes', [
        'name' => 'Bad Route',
        'user_ids' => [$external->id, $nonRep->id],
    ]);

    $res->assertSessionHasErrors('user_ids');

    $this->assertDatabaseMissing('delivery_routes', ['name' => 'Bad Route']);
});

test('company admin can update route assigned sales reps', function () {
    $companyCode = 'RT003';
    Company::factory()->create(['company_code' => $companyCode]);
    $salesRole = Role::firstOrCreate(['slug' => 'sales_rep'], ['name' => 'Sales Rep', 'level' => 'section_user']);

    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);
    $routeId = \App\Models\DeliveryRoute::create(['name' => 'Updatable Route', 'company_code' => $companyCode])->id;

    $rep = User::factory()->create(['company_code' => $companyCode, 'role_id' => $salesRole->id]);

    $this->actingAs($admin);

    $res = $this->put("/deliveries/routes/{$routeId}", [
        'name' => 'Updatable Route',
        'user_ids' => [$rep->id],
    ]);

    $res->assertRedirect(route('delivery.routes.show', ['route' => $routeId]));

    $this->assertDatabaseHas('delivery_route_user', ['delivery_route_id' => $routeId, 'user_id' => $rep->id]);
});

test('cannot update route with invalid assigned users', function () {
    $companyCode = 'RT004';
    Company::factory()->create(['company_code' => $companyCode]);
    $other = 'EXT';

    $salesRole = Role::firstOrCreate(['slug' => 'sales_rep'], ['name' => 'Sales Rep', 'level' => 'section_user']);

    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);
    $routeId = \App\Models\DeliveryRoute::create(['name' => 'Bad Update Route', 'company_code' => $companyCode])->id;

    $external = User::factory()->create(['company_code' => $other]);
    $nonRep = User::factory()->create(['company_code' => $companyCode, 'role_id' => null]);

    $this->actingAs($admin);

    $res = $this->put("/deliveries/routes/{$routeId}", [
        'name' => 'Bad Update Route',
        'user_ids' => [$external->id, $nonRep->id],
    ]);

    $res->assertSessionHasErrors('user_ids');
});
