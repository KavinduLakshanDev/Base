<?php

use App\Models\Company;
use App\Models\Delivery;
use App\Models\DeliveryItem;
use App\Models\DeliveryRoute;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);

test('delivery item movement report returns ranked items and respects group_by filters', function () {
    $company = Company::create([
        'company_code' => 'DMOV01',
        'name' => 'Movement Co',
        'address' => '1 Move St',
        'phone' => '0700000002',
        'email' => 'move@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => 'DMOV01',
        'first_name' => 'Mover',
        'last_name' => 'User',
        'email' => 'mover@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $routeA = DeliveryRoute::create(['company_code' => 'DMOV01', 'name' => 'R-A', 'is_active' => true]);
    $routeB = DeliveryRoute::create(['company_code' => 'DMOV01', 'name' => 'R-B', 'is_active' => true]);

    // Delivery 1 on Route A (Item A: 10 units, Item B: 5 units)
    $d1 = Delivery::create([
        'delivery_number' => 'DM-001',
        'delivery_route_id' => $routeA->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DMOV01',
        'customer_name' => 'C1',
        'customer_address' => 'Unknown',
        'customer_phone' => '0000000000',
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    DeliveryItem::create([
        'delivery_id' => $d1->id,
        'ItmKy' => 'ITM-A',
        'batch_no' => 'B1',
        'ItemCode' => 'A1',
        'ItemName' => 'Item A',
        'quantity' => 10,
        'unit_price' => 100,
        'total_amount' => 1000,
    ]);

    DeliveryItem::create([
        'delivery_id' => $d1->id,
        'ItmKy' => 'ITM-B',
        'batch_no' => 'B1',
        'ItemCode' => 'B1',
        'ItemName' => 'Item B',
        'quantity' => 5,
        'unit_price' => 200,
        'total_amount' => 1000,
    ]);

    // Delivery 2 on Route B (Item A: 2 units)
    $d2 = Delivery::create([
        'delivery_number' => 'DM-002',
        'delivery_route_id' => $routeB->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DMOV01',
        'customer_name' => 'C2',
        'customer_address' => 'Unknown',
        'customer_phone' => '0000000000',
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    DeliveryItem::create([
        'delivery_id' => $d2->id,
        'ItmKy' => 'ITM-A',
        'batch_no' => 'B1',
        'ItemCode' => 'A1',
        'ItemName' => 'Item A',
        'quantity' => 2,
        'unit_price' => 100,
        'total_amount' => 200,
    ]);

    // Request report
    $response = $this->actingAs($user)->get('/reports/delivery-item-movement');
    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliveryItemMovement')
        ->where('summary.total_qty', 17)
        ->where('summary.total_revenue', 2200)
        ->has('items', 2)
        ->where('items.0.item_code', 'A1')
        ->where('items.0.qty_sold', 12)
        ->where('items.0.revenue', 1200)
    );

    // Group by route -> ensure by_group contains per-route top lists
    $respGrouped = $this->actingAs($user)->get('/reports/delivery-item-movement?group_by=route');
    $respGrouped->assertStatus(200);
    $respGrouped->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliveryItemMovement')
        ->has('by_group')
    );

    // CSV export contains Rs. and header
    $csv = $this->actingAs($user)->get('/reports/delivery-item-movement/export');
    $csv->assertStatus(200);
    $csv->assertSee('Rs.');
    $csv->assertSee('Item Code');
});
