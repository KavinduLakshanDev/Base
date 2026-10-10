<?php

use App\Models\Company;
use App\Models\Delivery;
use App\Models\DeliveryItem;
use App\Models\DeliveryPayment;
use App\Models\DeliveryRoute;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);

test('delivery summary report aggregates totals and respects filters', function () {
    $company = Company::create([
        'company_code' => 'DSUM01',
        'name' => 'Summary Co',
        'address' => '1 Summary St',
        'phone' => '0700000001',
        'email' => 'sum@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => 'DSUM01',
        'first_name' => 'Report',
        'last_name' => 'User',
        'email' => 'reportuser@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $routeA = DeliveryRoute::create([
        'company_code' => 'DSUM01',
        'name' => 'Route A',
        'is_active' => true,
    ]);

    $routeB = DeliveryRoute::create([
        'company_code' => 'DSUM01',
        'name' => 'Route B',
        'is_active' => true,
    ]);

    // Delivery 1 (Route A)
    $d1 = Delivery::create([
        'delivery_number' => 'SUM-001',
        'delivery_route_id' => $routeA->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DSUM01',
        'customer_name' => 'Customer One',
        'customer_address' => 'Addr 1',
        'customer_phone' => '0770000001',
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    DeliveryItem::create([
        'delivery_id' => $d1->id,
        'ItmKy' => 'ITM-1',
        'batch_no' => 'B1',
        'section_code' => 'MAIN',
        'ItemCode' => 'I1',
        'ItemName' => 'Item 1',
        'Unit' => 'pcs',
        'quantity' => 2,
        'unit_price' => 50,
        'total_amount' => 100,
    ]);

    DeliveryPayment::create([
        'delivery_id' => $d1->id,
        'amount' => 50,
        'method' => 'cash',
        'payment_date' => now()->toDateString(),
        'company_code' => 'DSUM01',
    ]);

    // Delivery 2 (Route B)
    $d2 = Delivery::create([
        'delivery_number' => 'SUM-002',
        'delivery_route_id' => $routeB->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DSUM01',
        'customer_name' => 'Customer Two',
        'customer_address' => 'Addr 2',
        'customer_phone' => '0770000002',
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    DeliveryItem::create([
        'delivery_id' => $d2->id,
        'ItmKy' => 'ITM-2',
        'batch_no' => 'B2',
        'section_code' => 'MAIN',
        'ItemCode' => 'I2',
        'ItemName' => 'Item 2',
        'Unit' => 'pcs',
        'quantity' => 3,
        'unit_price' => 100,
        'total_amount' => 300,
    ]);

    DeliveryPayment::create([
        'delivery_id' => $d2->id,
        'amount' => 300,
        'method' => 'card',
        'payment_date' => now()->toDateString(),
        'company_code' => 'DSUM01',
    ]);

    // Request full summary (no filters)
    $response = $this->actingAs($user)->get('/reports/delivery-summary');
    $response->assertStatus(200);

    $content = $response->getContent();

    // Assert Inertia props directly (more robust)
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliverySummary')
        ->where('summary.total_deliveries', 2)
        ->where('summary.total_items', 5)
        ->where('summary.total_value', 400)
        ->where('summary.total_paid', 350)
        ->where('summary.outstanding', 50)
        ->has('by_route', 2)
        ->has('by_rep', 1)
    );

    // Now apply filter route_id=Route A -> props should only include Route A in by_route
    $respFiltered = $this->actingAs($user)->get('/reports/delivery-summary?route_id=' . $routeA->id);
    $respFiltered->assertStatus(200);
    $respFiltered->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliverySummary')
        ->where('filters.route_id', (string)$routeA->id)
        ->has('by_route', 1, fn (Assert $page) => $page->where('route_name', 'Route A')->etc())
    );
});