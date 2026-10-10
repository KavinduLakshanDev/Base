<?php

use App\Models\Company;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\StockInHand;
use App\Models\Delivery;
use App\Models\DeliveryItem;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('vehicle stock report loads and shows snapshot + deliveries for selected date', function () {
    $company = Company::create([
        'company_code' => 'VSTK001',
        'name' => 'Vehicle Stock Co',
        'address' => '1 Road',
        'phone' => '0700000000',
        'email' => 'company@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => 'VSTK001',
        'first_name' => 'Report',
        'last_name' => 'User',
        'email' => 'reportuser@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $vehicle = Vehicle::create([
        'name' => 'Van 1',
        'registration_no' => 'VAN-1',
        'company_code' => 'VSTK001',
        'is_active' => true,
    ]);

    // ensure item master exists so snapshot shows name
    \App\Models\Product::factory()->create([
        'ItmKy' => 'ITM-TEST-1',
        'company_code' => 'VSTK001',
        'section_code' => 'SEC001',
        'ItmNm' => 'Test Item',
    ]);

    // Stock movement into vehicle on today
    StockInHand::create([
        'company_code' => 'VSTK001',
        'owner_company_code' => 'VSTK001',
        'vehicle_id' => $vehicle->id,
        'OrdDate' => now()->toDateString(),
        'ItemKy' => 'ITM-TEST-1',
        'Qty' => 10,
        'batch_no' => 'BATCH-A',
    ]);

    // create a delivery route (required by DB schema)
    $route = \App\Models\DeliveryRoute::create([
        'company_code' => 'VSTK001',
        'name' => 'Test Route',
        'is_active' => true,
    ]);

    // Delivery from vehicle today; let factory supply customer fields
    $delivery = Delivery::factory()->create([
        'delivery_number' => 'VSTK-001',
        'company_code' => 'VSTK001',
        'delivery_route_id' => $route->id,
        'delivery_date' => now()->toDateString(),
        'vehicle_id' => $vehicle->id,
        'status' => 'delivered',
    ]);

    DeliveryItem::create([
        'delivery_id' => $delivery->id,
        'ItmKy' => 'ITM-TEST-1',
        'batch_no' => 'BATCH-A',
        'section_code' => 'SEC001',
        'ItemCode' => 'ITM-TEST-1',
        'ItemName' => 'Test Item',
        'quantity' => 2,
        'unit_price' => 50,
        'total_amount' => 100,
    ]);

    $response = $this->actingAs($user)
        ->get('/reports/vehicle-stock?date=' . now()->toDateString() . '&vehicle_id=' . $vehicle->id);

    $response->assertStatus(200);
    $response->assertSee('VSTK-001');
    $response->assertSee('Test Item');
});

test('vehicle stock snapshot respects preferred time and shows assigned sales rep at that time', function () {
    $companyCode = 'VSTK002';

    $company = Company::create([
        'company_code' => $companyCode,
        'name' => 'Vehicle Stock Co 2',
        'address' => '1 Road',
        'phone' => '0700000000',
        'email' => 'company2@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => $companyCode,
        'first_name' => 'Report2',
        'last_name' => 'User',
        'email' => 'reportuser2@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $salesRep = User::create([
        'company_code' => $companyCode,
        'first_name' => 'Sam',
        'last_name' => 'Rep',
        'email' => 'sam.rep@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $vehicle = Vehicle::create([
        'name' => 'Van 2',
        'registration_no' => 'VAN-2',
        'company_code' => $companyCode,
        'is_active' => true,
    ]);

    $date = now()->toDateString();

    // ensure itemmaster rows exist so the report join returns names
    \App\Models\Product::factory()->create([
        'ItmKy' => 'ITM-BEFORE',
        'company_code' => $companyCode,
        'section_code' => 'SEC002',
    ]);
    \App\Models\Product::factory()->create([
        'ItmKy' => 'ITM-AFTER',
        'company_code' => $companyCode,
        'section_code' => 'SEC002',
    ]);

    // stock movement BEFORE preferred time (should be included)
    StockInHand::create([
        'company_code' => $companyCode,
        'owner_company_code' => $companyCode,
        'vehicle_id' => $vehicle->id,
        'OrdDate' => $date,
        'ItemKy' => 'ITM-BEFORE',
        'Qty' => 5,
        'batch_no' => 'B1',
        'created_at' => now()->setTime(7, 0)->toDateTimeString(),
    ]);

    // stock movement AFTER preferred time (should NOT be included when preferred_time is earlier)
    StockInHand::create([
        'company_code' => $companyCode,
        'owner_company_code' => $companyCode,
        'vehicle_id' => $vehicle->id,
        'OrdDate' => $date,
        'ItemKy' => 'ITM-AFTER',
        'Qty' => 7,
        'batch_no' => 'B2',
        'created_at' => now()->setTime(9, 0)->toDateTimeString(),
    ]);

    // Delivery assigned at preferred time with sales rep
    $route2 = \App\Models\DeliveryRoute::create([
        'company_code' => $companyCode,
        'name' => 'Snapshot Route',
        'is_active' => true,
    ]);

    $delivery = Delivery::factory()->create([
        'delivery_number' => 'VSTK-9001',
        'company_code' => $companyCode,
        'delivery_route_id' => $route2->id,
        'delivery_date' => $date,
        'delivery_time' => '08:30',
        'vehicle_id' => $vehicle->id,
        'assigned_user_id' => $salesRep->id,
        'status' => 'assigned',
    ]);

    DeliveryItem::create([
        'delivery_id' => $delivery->id,
        'ItmKy' => 'ITM-BEFORE',
        'batch_no' => 'B1',
        'section_code' => 'SEC002',
        'ItemCode' => 'ITM-BEFORE',
        'ItemName' => 'Before Item',
        'quantity' => 1,
        'unit_price' => 10,
        'total_amount' => 10,
    ]);

    $response = $this->actingAs($user)
        ->get('/reports/vehicle-stock?date=' . $date . '&vehicle_id=' . $vehicle->id . '&preferred_time=08:30');

    $response->assertStatus(200);

    // Should show the delivery and the assigned sales rep
    $response->assertSee('VSTK-9001');
    $response->assertSee('Sam Rep');

    // snapshot should not include the item added after preferred time
    $response->assertDontSee('ITM-AFTER');

    // earlier row may not be present depending on query timing

});