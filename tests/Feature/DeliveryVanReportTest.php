<?php

use App\Models\Company;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\DeliveryItem;
use App\Models\DeliveryRoute;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('van report page loads and shows deliveries for selected customer', function () {
    $company = Company::create([
        'company_code' => 'VAN001',
        'name' => 'Van Test',
        'address' => '1 Road',
        'phone' => '0700000000',
        'email' => 'van@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => 'VAN001',
        'first_name' => 'Van',
        'last_name' => 'User',
        'email' => 'vanuser@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $customer = Customer::create([
        'company_code' => 'VAN001',
        'FstNm' => 'Test Shop',
        'LstNm' => null,
        'TP1' => '0771234567',
        'AdrTypKy' => 1,
        'Status' => 'A',
    ]);

    $route = DeliveryRoute::create([
        'company_code' => 'VAN001',
        'name' => 'Van Route',
        'is_active' => true,
    ]);

    $delivery = Delivery::create([
        'delivery_number' => 'VAN-0001',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'VAN001',
        'customer_name' => 'Test Shop',
        'customer_address' => 'Shop Address',
        'customer_phone' => '0771234567',
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    DeliveryItem::create([
        'delivery_id' => $delivery->id,
        'ItmKy' => 'ITM-X1',
        'batch_no' => 'BATCH1',
        'section_code' => 'MAIN',
        'ItemCode' => 'X1',
        'ItemName' => 'Widget',
        'Unit' => 'pcs',
        'quantity' => 2,
        'unit_price' => 50,
        'total_amount' => 100,
    ]);

    $response = $this->actingAs($user)
        ->get('/deliveries/van-report?customer_id=' . $customer->AdrKy);

    $response->assertStatus(200);
    $this->assertStringContainsString('VAN-0001', $response->getContent());
    // ensure customer dropdown is populated (address-based customer)
    $this->assertStringContainsString('Test Shop', $response->getContent());

    // Also verify fallback: create a delivery-only customer (no Address row) and ensure it appears
    $delivery2 = Delivery::create([
        'delivery_number' => 'VAN-0002',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'VAN001',
        'customer_name' => 'Fallback Shop',
        'customer_address' => 'Fallback Address',
        'customer_phone' => '0779990000',
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    // Selecting delivery-only customer by phone works
    $response2 = $this->actingAs($user)->get('/deliveries/van-report?customer_id=' . urlencode('0779990000'));
    $response2->assertStatus(200);
    $this->assertStringContainsString('Fallback Shop', $response2->getContent());

    // Now create a delivery-only customer WITHOUT phone and ensure name-only key works (name:...)
    $delivery3 = Delivery::create([
        'delivery_number' => 'VAN-0003',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'VAN001',
        'customer_name' => 'NameOnly Shop',
        'customer_address' => 'NameOnly Address',
        'customer_phone' => '', // DB requires non-null; use empty string to simulate missing phone
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    $key = 'name:' . substr('NameOnly Shop', 0, 40);
    $response3 = $this->actingAs($user)->get('/deliveries/van-report?customer_id=' . urlencode($key));
    $response3->assertStatus(200);
    $this->assertStringContainsString('VAN-0003', $response3->getContent());
    $this->assertStringContainsString('NameOnly Shop', $response3->getContent());

    // --- shop-backed customer: ensure shops are offered and can be selected by shop:<id>
    $shop = Shop::create(['company_code' => 'VAN001', 'name' => 'Shop From Table', 'contact_phone' => '0781112222']);
    $delivery4 = Delivery::create([
        'delivery_number' => 'VAN-0004',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => $user->id,
        'company_code' => 'VAN001',
        'shop_id' => $shop->id,
        'customer_name' => '',
        'customer_address' => '',
        'customer_phone' => '',
        'delivery_date' => now()->toDateString(),
        'status' => 'delivered',
    ]);

    $response4 = $this->actingAs($user)->get('/deliveries/van-report?customer_id=' . urlencode('shop:' . $shop->id));
    $response4->assertStatus(200);
    $this->assertStringContainsString('VAN-0004', $response4->getContent());
    $this->assertStringContainsString('Shop From Table', $response4->getContent());
});