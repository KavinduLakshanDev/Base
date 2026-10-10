<?php

/**
 * @var \Tests\TestCase $this
 *
 * @mixin \Illuminate\Foundation\Testing\TestCase
 */


use App\Models\Company;
use App\Models\Delivery;
use App\Models\DeliveryRoute;
use App\Models\Product;
use App\Models\Section;
use App\Models\StockInHand;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleStock;
use Illuminate\Foundation\Testing\DatabaseTransactions;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\post;
use function Pest\Laravel\put;
use function Pest\Laravel\assertDatabaseHas;

uses(DatabaseTransactions::class);

test('delivery creation using vehicle stock deducts vehicle_stock and creates V-DEL record', function () {
    $company = Company::factory()->create(['company_code' => 'VTEST']);
    $user = User::create(['company_code' => 'VTEST', 'first_name' => 'Driver', 'last_name' => 'One', 'email' => 'driver@example.test', 'password' => bcrypt('password'), 'user_type' => 'super_admin', 'is_active' => true]);

    $route = DeliveryRoute::create(['company_code' => 'VTEST', 'name' => 'Route 1', 'is_active' => true]);

    $product = Product::create(['company_code' => 'VTEST', 'ItmKy' => 2001, 'ItmNm' => 'Vehicle Item', 'ItemCode' => 'VITM001', 'section_code' => 'MAIN', 'fInAct' => false, 'CosPri' => 10, 'SlsPri' => 15]);

    $vehicle = Vehicle::create(['name' => 'Van A', 'registration_no' => 'VAN-001', 'assigned_user_id' => $user->id, 'company_code' => 'VTEST']);

    VehicleStock::create(['vehicle_id' => $vehicle->id, 'item_ky' => 2001, 'batch_no' => 'VB1', 'quantity' => 50, 'reserved_quantity' => 0, 'company_code' => 'VTEST']);

    actingAs($user);

    $deliveryData = [
        'customer_name' => 'Customer A',
        'customer_address' => 'Addr',
        'customer_phone' => '0771234567',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'vehicle_id' => $vehicle->id,
        'delivery_date' => now()->toDateString(),
        'items' => [
            [
                'ItmKy' => '2001',
                'batch_no' => 'VB1',
                'section_code' => 'MAIN',
                'quantity' => 5,
                'unit_price' => 15.00,
            ]
        ],
    ];

    $response = post('/deliveries', $deliveryData);
    $response->assertRedirect('/deliveries');

    // vehicle stock should be reduced by 5
    $vs = VehicleStock::where('vehicle_id', $vehicle->id)->where('item_ky', 2001)->where('batch_no', 'VB1')->first();
    expect((float)$vs->quantity)->toBe(45.0);

    // There should be a stock_in_hand V-DEL record for vehicle
    $record = StockInHand::where('TrnTyp', 'V-DEL')->where('vehicle_id', $vehicle->id)->where('ItemKy', 2001)->first();
    expect($record)->not->toBeNull();
    expect((float)$record->Qty)->toBe(-5.0);
});

// ensure vehicle names and registration numbers are unique within a company

uses(DatabaseTransactions::class);

test('vehicle name and registration number must be unique on create', function () {
    $company = Company::factory()->create(['company_code' => 'VTEST']);
    $user = User::create(['company_code' => 'VTEST', 'first_name' => 'Admin', 'last_name' => 'User', 'email' => 'admin@test', 'password' => bcrypt('password'), 'user_type' => 'super_admin', 'is_active' => true]);
    actingAs($user);

    Vehicle::create(['name' => 'Van A', 'registration_no' => 'ABC123', 'company_code' => 'VTEST']);

    $response = post('/deliveries/vehicles', [
        'name' => 'Van A',
        'registration_no' => 'ABC123',
    ]);
    $response->assertSessionHasErrors(['name', 'registration_no']);
});


test('vehicle name and registration number must be unique on update', function () {
    $company = Company::factory()->create(['company_code' => 'VTEST']);
    $user = User::create(['company_code' => 'VTEST', 'first_name' => 'Admin', 'last_name' => 'User', 'email' => 'admin2@test', 'password' => bcrypt('password'), 'user_type' => 'super_admin', 'is_active' => true]);
    actingAs($user);

    $v1 = Vehicle::create(['name' => 'Van A', 'registration_no' => 'ABC123', 'company_code' => 'VTEST']);
    $v2 = Vehicle::create(['name' => 'Van B', 'registration_no' => 'XYZ789', 'company_code' => 'VTEST']);

    $response = put("/deliveries/vehicles/{$v2->id}", [
        'name' => 'Van A',
        'registration_no' => 'ABC123',
    ]);
    $response->assertSessionHasErrors(['name', 'registration_no']);
});

test('shop return records a return and redirects (controller + service tested separately)', function () {
    $company = Company::factory()->create(['company_code' => 'VTEST']);
    $user = User::create(['company_code' => 'VTEST', 'first_name' => 'Driver', 'last_name' => 'One', 'email' => 'driver2@example.test', 'password' => bcrypt('password'), 'user_type' => 'super_admin', 'is_active' => true]);

    $vehicle = Vehicle::create(['name' => 'Van B', 'registration_no' => 'VAN-002', 'assigned_user_id' => $user->id, 'company_code' => 'VTEST']);

    $product = Product::create(['company_code' => 'VTEST', 'ItmKy' => 2002, 'ItmNm' => 'Vehicle Item 2', 'ItemCode' => 'VITM002', 'section_code' => 'MAIN', 'fInAct' => false, 'CosPri' => 8, 'SlsPri' => 12]);

    VehicleStock::create(['vehicle_id' => $vehicle->id, 'item_ky' => 2002, 'batch_no' => 'VB2', 'quantity' => 10, 'reserved_quantity' => 0, 'company_code' => 'VTEST']);

    $shop = \App\Models\Shop::create(['name' => 'Shop A', 'company_code' => 'VTEST']);

    actingAs($user);

    $payload = [
        'shop_id' => $shop->id,
        'vehicle_id' => $vehicle->id,
        'return_date' => now()->toDateString(),
        'items' => [
            ['item_ky' => '2002', 'batch_no' => 'VB2', 'quantity' => 3, 'unit_price' => 12.00]
        ]
    ];

    // exercise controller routing (redirect + permissions) and verify stock updates
    $response = post('/deliveries/returns', $payload);
    $response->assertRedirect();

    $response->assertSessionHas('success');

    // ensure ShopReturn row exists
    assertDatabaseHas('shop_returns', ['shop_id' => $shop->id]);

    // vehicle stock should have increased by 3 (10 + 3 = 13)
    $vs = VehicleStock::where('vehicle_id', $vehicle->id)->where('item_ky', 2002)->where('batch_no', 'VB2')->first();
    expect($vs)->not->toBeNull();
    expect((float)$vs->quantity)->toBe(13.0);

    // There should be a StockInHand V-RET record for vehicle
    $rec = StockInHand::where('TrnTyp', 'V-RET')->where('vehicle_id', $vehicle->id)->where('ItemKy', 2002)->first();
    expect($rec)->not->toBeNull();
    expect((float)$rec->Qty)->toBe(3.0);
});


// New test: returned quantity reduces matching delivery item qty and updates delivery totals
test('shop return decreases delivered quantity on matching delivery and credits vehicle stock', function () {
    $company = Company::factory()->create(['company_code' => 'VTEST']);
    $user = User::create(['company_code' => 'VTEST', 'first_name' => 'Driver', 'last_name' => 'Two', 'email' => 'driver4@example.test', 'password' => bcrypt('password'), 'user_type' => 'super_admin', 'is_active' => true]);

    $route = DeliveryRoute::create(['company_code' => 'VTEST', 'name' => 'Route X', 'is_active' => true]);

    $vehicle = Vehicle::create(['name' => 'Van Z', 'registration_no' => 'VAN-010', 'assigned_user_id' => $user->id, 'company_code' => 'VTEST']);

    $product = Product::create(['company_code' => 'VTEST', 'ItmKy' => 2003, 'ItmNm' => 'Vehicle Item 10', 'ItemCode' => 'VITM010', 'section_code' => 'MAIN', 'fInAct' => false, 'CosPri' => 5, 'SlsPri' => 20]);

    VehicleStock::create(['vehicle_id' => $vehicle->id, 'item_ky' => 2003, 'batch_no' => 'B10', 'quantity' => 10, 'reserved_quantity' => 0, 'company_code' => 'VTEST']);

    $shop = \App\Models\Shop::create(['name' => 'Shop Z', 'company_code' => 'VTEST']);

    actingAs($user);

    // 1) Create a delivery to the shop with quantity 2
    $deliveryData = [
        'customer_name' => 'Shop Z',
        'shop_id' => $shop->id,
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'vehicle_id' => $vehicle->id,
        'delivery_date' => now()->toDateString(),
        'items' => [
            [
                'ItmKy' => '2003',
                'batch_no' => 'B10',
                'section_code' => 'MAIN',
                'quantity' => 2,
                'unit_price' => 20.00,
            ]
        ],
    ];

    $resp = post('/deliveries', $deliveryData);
    $resp->assertRedirect('/deliveries');

    // vehicle stock should now be 8 (10 - 2)
    $vs = VehicleStock::where('vehicle_id', $vehicle->id)->where('item_ky', 2003)->where('batch_no', 'B10')->first();
    expect((float)$vs->quantity)->toBe(8.0);

    $delivery = Delivery::firstWhere('shop_id', $shop->id);
    $this->assertNotNull($delivery);
    $dItem = $delivery->items()->where('ItmKy', '2003')->where('batch_no', 'B10')->first();
    expect((float)$dItem->quantity)->toBe(2.0);
    expect((float)$delivery->total_amount)->toBe(40.0);

    // 2) Record a shop return of quantity 1 for the same item
    $payload = [
        'shop_id' => $shop->id,
        'vehicle_id' => $vehicle->id,
        'return_date' => now()->toDateString(),
        'items' => [
            ['item_ky' => '2003', 'batch_no' => 'B10', 'quantity' => 1, 'unit_price' => 20.00]
        ]
    ];

    $r = post('/deliveries/returns', $payload);
    $r->assertRedirect();
    $r->assertSessionHas('success');

    // vehicle stock should increase by 1 => back to 9
    $vsRefresh = VehicleStock::where('vehicle_id', $vehicle->id)->where('item_ky', 2003)->where('batch_no', 'B10')->first();
    expect((float)$vsRefresh->quantity)->toBe(9.0);

    // DeliveryItem quantity should have decreased to 1 and delivery total updated
    $delivery->refresh();
    $dItem->refresh();
    expect((float)$dItem->quantity)->toBe(1.0);
    expect((float)$delivery->total_amount)->toBe(20.0);
    expect((float)$delivery->outstanding_balance)->toBe(20.0);
});

test('VehicleStockService::addToVehicle increases vehicle stock and creates V-RET (delivered counter decreases)', function () {
    $company = Company::factory()->create(['company_code' => 'VTEST']);
    $user = User::create(['company_code' => 'VTEST', 'first_name' => 'Driver', 'last_name' => 'One', 'email' => 'driver3@example.test', 'password' => bcrypt('password'), 'user_type' => 'super_admin', 'is_active' => true]);

    $vehicle = Vehicle::create(['name' => 'Van C', 'registration_no' => 'VAN-003', 'assigned_user_id' => $user->id, 'company_code' => 'VTEST']);

    Product::create(['company_code' => 'VTEST', 'ItmKy' => '2004', 'ItmNm' => 'Vehicle Item 3', 'ItemCode' => 'VITM003', 'section_code' => 'MAIN', 'fInAct' => false, 'CosPri' => 5, 'SlsPri' => 9]);

    // Start with some delivered quantity so return will reduce it
    VehicleStock::create(['vehicle_id' => $vehicle->id, 'item_ky' => 2004, 'batch_no' => 'VB3', 'quantity' => 7, 'delivered_quantity' => 10, 'reserved_quantity' => 0, 'company_code' => 'VTEST']);

    $svc = app(\App\Services\VehicleStockService::class);
    $svc->addToVehicle($vehicle->id, 2004, 'VB3', 5, 'VTEST');

    $vs = VehicleStock::where('vehicle_id', $vehicle->id)->where('item_ky', 2004)->where('batch_no', 'VB3')->first();
    $this->assertNotNull($vs);
    $this->assertEquals(12.0, (float)$vs->quantity);
    $this->assertEquals(5.0, (float)$vs->delivered_quantity);

    $rec = StockInHand::where('TrnTyp', 'V-RET')->where('vehicle_id', $vehicle->id)->where('ItemKy', 2004)->first();
    $this->assertNotNull($rec);
    $this->assertEquals(5.0, (float)$rec->Qty);
});