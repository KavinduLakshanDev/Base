<?php

use App\Models\Role;
use App\Models\User;
use App\Models\DeliveryRoute;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('company admin can create shop and assign delivery route', function () {
    $companyCode = 'SH001';

    \App\Models\Company::factory()->create(['company_code' => $companyCode]);
    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);

    $route = DeliveryRoute::create(['company_code' => $companyCode, 'name' => 'Route X', 'is_active' => true]);

    $this->actingAs($admin);

    $res = $this->post('/deliveries/shops', [
        'name' => 'Shop A',
        'address' => '123 Test Ave',
        'contact_phone' => '0771234567',
        'delivery_route_id' => $route->id,
    ]);

    $res->assertRedirect(route('delivery.shops.index'));

    $this->assertDatabaseHas('shops', ['name' => 'Shop A', 'company_code' => $companyCode, 'delivery_route_id' => $route->id]);
});

test('cannot assign a delivery route from another company when creating shop', function () {
    $companyCode = 'SH002';
    $other = 'EXT1';

    \App\Models\Company::factory()->create(['company_code' => $companyCode]);
    \App\Models\Company::factory()->create(['company_code' => $other]);

    $admin = User::factory()->create(['company_code' => $companyCode, 'user_type' => 'super_admin']);
    $externalRoute = DeliveryRoute::create(['company_code' => $other, 'name' => 'External Route', 'is_active' => true]);

    $this->actingAs($admin);

    $res = $this->post('/deliveries/shops', [
        'name' => 'Shop Bad',
        'delivery_route_id' => $externalRoute->id,
    ]);

    $res->assertSessionHasErrors('delivery_route_id');
    $this->assertDatabaseMissing('shops', ['name' => 'Shop Bad']);
});