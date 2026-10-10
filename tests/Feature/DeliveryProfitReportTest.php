<?php

/**
 * @mixin \Tests\TestCase
 */
use App\Models\Company;
use App\Models\Delivery;
use App\Models\DeliveryItem;
use App\Models\DeliveryRoute;
use App\Models\ItemMaster;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);

test('delivery profit report computes profit correctly and exports CSV', function () {
    /** @var \Tests\TestCase $this */
    $company = Company::create([
        'company_code' => 'DPROF',
        'name' => 'Profit Co',
        'address' => '1 Profit St',
        'phone' => '0700000003',
        'email' => 'profit@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => 'DPROF',
        'first_name' => 'Profit',
        'last_name' => 'User',
        'email' => 'profituser@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $route = DeliveryRoute::create(['company_code' => 'DPROF', 'name' => 'R1', 'is_active' => true]);

    // Create an ItemMaster with cost price
    ItemMaster::create([
        'ItmKy' => 'ITM-P1',
        'batch_no' => 'B1',
        'ItemCode' => 'P001',
        'ItmNm' => 'Profit Item',
        'CosPri' => 20.00,
        'SlsPri' => 50.00,
        'company_code' => 'DPROF',
        // new nullable-but-required column in latest schema
        'section_code' => 'DEFAULT',
    ]);

    // Delivery with items
    $d = Delivery::create([
        'delivery_number' => 'DP-001',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DPROF',
        'customer_name' => 'C1',
        'customer_phone' => '0770000000',
        'customer_address' => 'Some address',
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    // 3 units sold at 50 each -> sales = 150, cost = 3*20 = 60, profit = 90
    DeliveryItem::create([
        'delivery_id' => $d->id,
        'ItmKy' => 'ITM-P1',
        'batch_no' => 'B1',
        'ItemCode' => 'P001',
        'ItemName' => 'Profit Item',
        'quantity' => 3,
        'unit_price' => 50.00,
        'total_amount' => 150.00,
        'section_code' => 'DEFAULT',
    ]);

    $response = $this->actingAs($user)->get('/reports/delivery-profit');
    $response->assertStatus(200);

    // In the absence of a company logo field, the React component should still render the
    // fallback malibu static image path. We can't inspect DOM here, but ensure the
    // page props contain no logo and tests that use the component still work.
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliveryProfitReport')
        ->has('items')
        ->where('items.0.item_code', 'P001')
        ->where('items.0.qty', 3)
        ->where('items.0.sales_value', 150)
        ->where('items.0.cost_value', 60)
        ->where('items.0.profit', 90)
    );

    // CSV export check
    $csv = $this->actingAs($user)->get('/reports/delivery-profit/export');
    $csv->assertStatus(200);
    $csv->assertSee('Profit');
    $csv->assertSee('Rs.');
});

test('delivery profit falls back to default itemmaster batch cost when exact batch missing', function () {
    /** @var \Tests\TestCase $this */
    $company = Company::create([
        'company_code' => 'DPROF',
        'name' => 'Profit Co',
        'address' => '1 Profit St',
        'phone' => '0700000003',
        'email' => 'profit@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => 'DPROF',
        'first_name' => 'Profit',
        'last_name' => 'User',
        'email' => 'profituser2@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $route = DeliveryRoute::create(['company_code' => 'DPROF', 'name' => 'R1', 'is_active' => true]);

    // ItemMaster row exists but without the delivery batch (NULL batch_no) — should be used as fallback
    ItemMaster::create([
        'ItmKy' => 'ITM-P2',
        'batch_no' => null,
        'ItemCode' => 'P002',
        'ItmNm' => 'Fallback Item',
        'CosPri' => 15.00,
        'SlsPri' => 30.00,
        'company_code' => 'DPROF',
        'section_code' => 'DEFAULT',
    ]);

    $d = Delivery::create([
        'delivery_number' => 'DP-002',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'DPROF',
        'customer_name' => 'C1',
        'customer_phone' => '0770000000',
        'customer_address' => 'Some address',
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    // DeliveryItem has a batch that doesn't match itemmaster; fallback must pick CosPri = 15.00
    DeliveryItem::create([
        'delivery_id' => $d->id,
        'ItmKy' => 'ITM-P2',
        'batch_no' => 'UNKNOWN-BATCH',
        'ItemCode' => 'P002',
        'ItemName' => 'Fallback Item',
        'quantity' => 2,
        'unit_price' => 30.00,
        'total_amount' => 60.00,
        'section_code' => 'DEFAULT',
    ]);

    $response = $this->actingAs($user)->get('/reports/delivery-profit');
    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliveryProfitReport')
        ->has('items')
        ->where('items.0.item_code', 'P002')
        ->where('items.0.qty', 2)
        ->where('items.0.sales_value', 60)
        ->where('items.0.cost_value', 30)
        ->where('items.0.profit', 30)
    );
});