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

test('delivery sales report returns aggregated sales and respects filters', function () {
    /** @var \Tests\TestCase $this */
    $company = Company::create([
        'company_code' => 'DSALES01',
        'name' => 'Sales Co',
        'address' => '1 Sales St',
        'phone' => '0700000002',
        'email' => 'sales@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => 'DSALES01',
        'first_name' => 'Sales',
        'last_name' => 'User',
        'email' => 'salesuser@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $routeA = DeliveryRoute::create([
        'company_code' => 'DSALES01',
        'name' => 'Route A',
        'is_active' => true,
    ]);

    $routeB = DeliveryRoute::create([
        'company_code' => 'DSALES01',
        'name' => 'Route B',
        'is_active' => true,
    ]);

    // Delivery 1 (Route A)
    $d1 = Delivery::create([
        'delivery_number' => 'SALES-001',
        'delivery_route_id' => $routeA->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DSALES01',
        'customer_name' => 'Customer One',
        'customer_address' => 'Addr 1',
        'customer_phone' => '0770000003',
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
        'company_code' => 'DSALES01',
    ]);

    // Delivery 2 (Route B)
    $d2 = Delivery::create([
        'delivery_number' => 'SALES-002',
        'delivery_route_id' => $routeB->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DSALES01',
        'customer_name' => 'Customer Two',
        'customer_address' => 'Addr 2',
        'customer_phone' => '0770000004',
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

    // use a valid enum value; 'card' is not allowed so convert to 'transfer'
    DeliveryPayment::create([
        'delivery_id' => $d2->id,
        'amount' => 200,
        'method' => 'transfer',
        'payment_date' => now()->toDateString(),
        'company_code' => 'DSALES01',
    ]);

    $response = $this->actingAs($user)->get('/reports/delivery-sales');
    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliverySalesReport')
        ->where('summary.total_deliveries', 2)
        ->where('summary.total_items', 5)
        ->where('summary.total_sales', 400)
        ->where('summary.total_paid', 300)
        ->where('summary.outstanding', 100)
        ->has('by_route', 2, function (Assert $page) {
            // ensure the items_list for each route contains the expected name and quantity
            $page->where('by_route.0.items_list.0.name', 'Item 1')
                 ->where('by_route.0.items_list.0.quantity', 2)
                 ->where('by_route.1.items_list.0.name', 'Item 2')
                 ->where('by_route.1.items_list.0.quantity', 3)
                 // items_details should also be returned
                 ->where('by_route.0.items_details.0.name', 'Item 1')
                 ->where('by_route.0.items_details.0.quantity', 2)
                 ->where('by_route.0.items_details.0.unit_price', 50)
                 ->where('by_route.1.items_details.0.name', 'Item 2')
                 ->where('by_route.1.items_details.0.quantity', 3)
                 ->where('by_route.1.items_details.0.unit_price', 100);
        })
        ->has('by_rep', 1, function (Assert $page) {
            // rep aggregated list should contain both items
            $page->where('by_rep.0.items_list.0.name', 'Item 1')
                 ->where('by_rep.0.items_list.0.quantity', 2)
                 ->where('by_rep.0.items_list.1.name', 'Item 2')
                 ->where('by_rep.0.items_list.1.quantity', 3)
                 // rep details should combine both deliveries
                 ->where('by_rep.0.items_details.0.name', 'Item 1')
                 ->where('by_rep.0.items_details.0.quantity', 2)
                 ->where('by_rep.0.items_details.0.unit_price', 50)
                 ->where('by_rep.0.items_details.1.name', 'Item 2')
                 ->where('by_rep.0.items_details.1.quantity', 3)
                 ->where('by_rep.0.items_details.1.unit_price', 100);
        })
    );

    // Filter by route A
    $respFiltered = $this->actingAs($user)->get('/reports/delivery-sales?route_id=' . $routeA->id);
    $respFiltered->assertStatus(200);
    $respFiltered->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliverySalesReport')
        ->where('filters.route_id', (string)$routeA->id)
        // only route data should be present when we filter by route
        ->has('by_route', 1, fn (Assert $page) => $page
            ->where('route_name', 'Route A')
            ->where('items_details.0.name', 'Item 1')
            ->where('items_details.0.quantity', 2)
            ->etc()
        )
        ->has('by_rep', 0)
    );

    // Passing a malformed route_id should not cause a server error and
    // should be treated as if no filter was applied.
    $respMalformed = $this->actingAs($user)->get('/reports/delivery-sales?route_id=1:1');
    $respMalformed->assertStatus(200);
    $respMalformed->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliverySalesReport')
        ->where('filters.route_id', null)
    );

    // Filter by sales rep should clear the route summary
    $respRep = $this->actingAs($user)->get('/reports/delivery-sales?rep_id=' . $user->id);
    $respRep->assertStatus(200);
    $respRep->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliverySalesReport')
        ->where('filters.rep_id', (string)$user->id)
        ->has('by_rep', 1)
        ->has('by_route', 0)
    );
});
