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

test('delivery graph analysis report returns time-series and aggregates', function () {
    /** @var \Tests\TestCase $this */
    $company = Company::create([
        'company_code' => 'DGRAPH01',
        'name' => 'Graph Co',
        'address' => '1 Graph St',
        'phone' => '0700000005',
        'email' => 'graph@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => 'DGRAPH01',
        'first_name' => 'Graph',
        'last_name' => 'User',
        'email' => 'graphuser@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $route = DeliveryRoute::create([
        'company_code' => 'DGRAPH01',
        'name' => 'Route X',
        'is_active' => true,
    ]);

    $d1 = Delivery::create([
        'delivery_number' => 'GRA-001',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DGRAPH01',
        'customer_name' => 'Customer A',
        'customer_address' => 'Addr A',
        'customer_phone' => '0770000006',
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
        'amount' => 100,
        'method' => 'cash',
        'payment_date' => now()->toDateString(),
        'company_code' => 'DGRAPH01',
    ]);

    $response = $this->actingAs($user)->get('/reports/delivery-graph-analysis');
    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliveryGraphAnalysisReport')
        ->where('summary.total_deliveries', 1)
        ->where('summary.total_sales', 100)
        ->where('summary.total_collections', 100)
        ->has('time_series')
        ->has('by_route')
        ->has('by_rep')
    );

    // Filter by route should narrow results
    $respFiltered = $this->actingAs($user)->get('/reports/delivery-graph-analysis?route_id=' . $route->id);
    $respFiltered->assertStatus(200);
    $respFiltered->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliveryGraphAnalysisReport')
        ->where('filters.route_id', (string)$route->id)
    );
});
