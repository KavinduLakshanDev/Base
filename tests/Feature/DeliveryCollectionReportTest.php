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

test('delivery collection report aggregates payments and compares with previous period', function () {
    /** @var \Tests\TestCase $this */

    $company = Company::create([
        'company_code' => 'DCOLL01',
        'name' => 'Collection Co',
        'address' => '1 Collect St',
        'phone' => '0700000005',
        'email' => 'collect@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => 'DCOLL01',
        'first_name' => 'Coll',
        'last_name' => 'User',
        'email' => 'colluser@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $route = DeliveryRoute::create([
        'company_code' => 'DCOLL01',
        'name' => 'Route 1',
        'is_active' => true,
    ]);

    // Current period delivery & payment
    $dNow = Delivery::create([
        'delivery_number' => 'DC-001',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DCOLL01',
        'customer_name' => 'Customer Now',
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    DeliveryItem::create([
        'delivery_id' => $dNow->id,
        'ItmKy' => 'ITM-1',
        'batch_no' => 'B1',
        'section_code' => 'MAIN',
        'ItemCode' => 'I1',
        'ItemName' => 'Item 1',
        'Unit' => 'pcs',
        'quantity' => 1,
        'unit_price' => 100,
        'total_amount' => 100,
    ]);

    DeliveryPayment::create([
        'delivery_id' => $dNow->id,
        'amount' => 100,
        'method' => 'cash',
        'payment_date' => now()->toDateString(),
        'company_code' => 'DCOLL01',
    ]);

    // Previous period delivery & payment (one period earlier)
    $dPrev = Delivery::create([
        'delivery_number' => 'DC-000',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DCOLL01',
        'customer_name' => 'Customer Prev',
        'delivery_date' => now()->subDays(7)->toDateString(),
        'status' => 'delivered',
    ]);

    DeliveryItem::create([
        'delivery_id' => $dPrev->id,
        'ItmKy' => 'ITM-2',
        'batch_no' => 'B2',
        'section_code' => 'MAIN',
        'ItemCode' => 'I2',
        'ItemName' => 'Item 2',
        'Unit' => 'pcs',
        'quantity' => 2,
        'unit_price' => 50,
        'total_amount' => 100,
    ]);

    DeliveryPayment::create([
        'delivery_id' => $dPrev->id,
        'amount' => 50,
        'method' => 'cash',
        'payment_date' => now()->subDays(7)->toDateString(),
        'company_code' => 'DCOLL01',
    ]);

    $response = $this->actingAs($user)->get('/reports/delivery-collections');
    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliveryCollectionReport')
        ->where('summary.total_collections', 150)
        ->has('by_rep', 1)
    );

    // Filter by route
    $respFiltered = $this->actingAs($user)->get('/reports/delivery-collections?route_id=' . $route->id);
    $respFiltered->assertStatus(200);
    $respFiltered->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliveryCollectionReport')
        ->where('filters.route_id', (string)$route->id)
    );
});
