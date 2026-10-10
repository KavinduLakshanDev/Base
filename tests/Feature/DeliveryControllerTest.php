<?php

/**
 * @mixin \Illuminate\Foundation\Testing\TestCase
 */

use App\Models\Company;
use App\Models\Delivery;
use App\Models\DeliveryItem;
use App\Models\DeliveryRoute;
use App\Models\Product;
use App\Models\Section;
use App\Models\StockInHand;
use App\Models\User;
use App\Models\VehicleStock;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;
use Illuminate\Support\Facades\DB;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\put;
use function Pest\Laravel\delete;


test('delivery create page includes vehicles and shops in props', function () {
    $company = \App\Models\Company::factory()->create(['company_code' => 'TSTC']);
    $user = \App\Models\User::factory()->create(['company_code' => 'TSTC', 'user_type' => 'super_admin']);
    /** @var \App\Models\User $user */

    // create a route and a shop linked to that route so we can verify frontend filtering
    $route = \App\Models\DeliveryRoute::create([
        'company_code' => 'TSTC',
        'name' => 'Test Route',
        'is_active' => true,
    ]);

    // shop created with delivery_route_id column set
    $shop = \App\Models\Shop::create([
        'name' => 'Wickrama Book Shop',
        'company_code' => 'TSTC',
        'delivery_route_id' => $route->id,
    ]);

    // also attach via pivot just to keep relation in sync
    $route->shops()->syncWithoutDetaching([$shop->id]);

    actingAs($user);

    $response = get('/deliveries/create');
    $response->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('delivery/create')
            ->has('vehicles')
            ->has('shops')
            // route should include the shop in its nested shops array
            ->has('routes.0.shops', 1)
            ->has('routes.0.shops.0', fn ($page) => $page
                ->where('id', $shop->id)
                ->etc()
            )
        );
});

// ensure edit page also receives routes with nested shops so frontend can filter
// even when a delivery already exists for the route/shop combination

test('delivery edit page includes route shops for filtering', function () {
    $company = \App\Models\Company::factory()->create(['company_code' => 'TSTC']);
    $user = \App\Models\User::factory()->create(['company_code' => 'TSTC', 'user_type' => 'super_admin']);
    /** @var \App\Models\User $user */

    $route = \App\Models\DeliveryRoute::create([
        'company_code' => 'TSTC',
        'name' => 'Another Route',
        'is_active' => true,
    ]);
    $shop = \App\Models\Shop::create([
        'name' => 'Route Shop',
        'company_code' => 'TSTC',
        'delivery_route_id' => $route->id,
    ]);
    $route->shops()->syncWithoutDetaching([$shop->id]);

    // create a delivery using that shop/route
    $delivery = \App\Models\Delivery::create([
        'company_code' => 'TSTC',
        'delivery_number' => 'DEL-EDIT',
        'customer_name' => 'Existing Customer',
        'customer_address' => '123 Route St',
        'customer_phone' => '0000000000',
        'delivery_route_id' => $route->id,
        'shop_id' => $shop->id,
        'delivery_date' => now()->toDateString(),
        'items' => [],
    ]);

    actingAs($user);
    $response = get("/deliveries/{$delivery->id}/edit");
    $response->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('delivery/edit')
            ->has('routes.0.shops', 1)
            ->has('routes.0.shops.0', fn ($page) => $page
                ->where('id', $shop->id)
                ->etc()
            )
        );
});



// you can omit batch number; the system will treat it as unfiltered and deduct from total stock
// (error message "items.1.batch_no field is required" should no longer appear)
test('delivery creation works when batch number is missing', function () {
    $company = Company::create([
        'company_code' => 'TEST002',
        'name' => 'Nullable Batch Co',
        'address' => 'Test Address',
        'phone' => '1234567890',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);
    $user = User::create([
        'company_code' => 'TEST002',
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'test2@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);
    $route = DeliveryRoute::create([
        'company_code' => 'TEST002',
        'name' => 'Test Route',
        'is_active' => true,
    ]);
    $section = Section::create([
        'uuid' => 'nullable-uuid',
        'company_code' => 'TEST002',
        'section_code' => 'MAIN',
        'name' => 'Main',
        'is_active' => true,
    ]);

    $product = Product::create([
        'company_code' => 'TEST002',
        'ItmKy' => 'TEST-001',
        'ItmNm' => 'Test Product',
        'ItemCode' => 'TP001',
        'section_code' => 'MAIN',
        'fInAct' => false,
        'CosPri' => 10.00,
        'SlsPri' => 15.00,
    ]);

    // create stock without specifying a batch
    StockInHand::create([
        'RefNo' => 'STK-1',
        'OrdDate' => now()->toDateString(),
        'ItemKy' => 'TEST-001',
        'Qty' => 100,
        'FreeQty' => 0,
        'TrnTyp' => 'PURCHASE',
        'batch_no' => null,
        'company_code' => 'TEST002',
        'owner_company_code' => 'TEST002',
        'section_code' => 'MAIN',
        'serial_number' => null,
        'brand' => 'Test Brand',
        'model' => 'Test Model',
        'unit' => 'PCS',
        'warranty' => null,
    ]);

    actingAs($user);

    $deliveryData = [
        'customer_name' => 'John Doe',
        'customer_address' => '123 Test Street',
        'customer_phone' => '+1234567890',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => null,
        'delivery_date' => now()->addDays(1)->toDateString(),
        'delivery_time' => 'morning',
        'priority' => 'normal',
        'notes' => 'Test delivery with no batch',
        'items' => [
            [
                'ItmKy' => 'TEST-001',
                'batch_no' => null,
                'section_code' => 'MAIN',
                'quantity' => 10,
                'unit_price' => 15.00,
            ]
        ],
    ];

    $response = post('/deliveries', $deliveryData);
    $response->assertRedirect('/deliveries');
    $response->assertSessionHas('success');

    $delivery = Delivery::where('customer_name', 'John Doe')->first();
    expect($delivery)->not->toBeNull();
    // controller converts null batch to empty string
    expect($delivery->items()->first()->batch_no)->toBe('');

    $finalStock = StockInHand::where('ItemKy', 'TEST-001')
        ->where('section_code', 'MAIN')
        ->selectRaw('SUM(Qty + COALESCE(FreeQty, 0)) as total')
        ->value('total');

    expect((float)$finalStock)->toBe(90.0);
});

test('delivery creation deducts stock correctly', function () {
    $company = Company::create([
        'company_code' => 'TEST001',
        'name' => 'Test Company',
        'address' => 'Test Address',
        'phone' => '1234567890',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);
    $user = User::create([
        'company_code' => 'TEST001',
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);
    $route = DeliveryRoute::create([
        'company_code' => 'TEST001',
        'name' => 'Test Route',
        'is_active' => true,
    ]);
    $section = Section::create([
        'uuid' => 'test-uuid-123',
        'company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'name' => 'Main Section',
    ]);
    $product = Product::create([
        'company_code' => 'TEST001',
        'ItmKy' => 'TEST-001',
        'ItmNm' => 'Test Product',
        'ItemCode' => 'TP001',
        'section_code' => 'MAIN',
        'fInAct' => false,
        'CosPri' => 10.00,
        'SlsPri' => 15.00,
    ]);

    // Add initial stock (positive transaction)
    StockInHand::create([
        'RefNo' => 'STOCK-IN-001',
        'OrdDate' => now()->toDateString(),
        'ItemKy' => 'TEST-001',
        'Qty' => 100,
        'FreeQty' => 0,
        'TrnTyp' => 'PURCHASE',
        'batch_no' => 'BATCH001',
        'company_code' => 'TEST001',
        'owner_company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'serial_number' => null,
        'brand' => 'Test Brand',
        'model' => 'Test Model',
        'unit' => 'PCS',
        'warranty' => null,
    ]);

    actingAs($user);

    // Check initial stock
    $initialStock = StockInHand::where('ItemKy', 'TEST-001')
        ->where('batch_no', 'BATCH001')
        ->where('section_code', 'MAIN')
        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

    expect((float)$initialStock)->toBe(100.0);

    // Double-check stock availability before creating delivery
    $availableStock = StockInHand::where('ItemKy', 'TEST-001')
        ->where('batch_no', 'BATCH001')
        ->where('company_code', 'TEST001')
        ->where('section_code', 'MAIN')
        ->selectRaw('SUM(Qty + COALESCE(FreeQty, 0)) as total_stock')
        ->value('total_stock') ?? 0;

    expect((float)$availableStock)->toBe(100.0);

    // Create delivery request data
    $deliveryData = [
        'customer_name' => 'John Doe',
        'customer_address' => '123 Test Street',
        'customer_phone' => '+1234567890',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => null,
        'delivery_date' => now()->addDays(1)->toDateString(),
        'delivery_time' => 'morning',
        'priority' => 'normal',
        'notes' => 'Test delivery',
        'items' => [
            [
                'ItmKy' => 'TEST-001',
                'batch_no' => 'BATCH001',
                'section_code' => 'MAIN',
                'quantity' => 10,
                'unit_price' => 15.00,
            ]
        ],
    ];

    // Submit delivery creation
    $response = post('/deliveries', $deliveryData);

    $response->assertRedirect('/deliveries');
    $response->assertSessionHas('success');

    // Verify delivery was created
    $delivery = Delivery::where('customer_name', 'John Doe')->first();
    expect($delivery)->not->toBeNull();
    expect($delivery->status)->toBe('assigned');

    // Verify delivery item was created
    $deliveryItem = DeliveryItem::where('delivery_id', $delivery->id)->first();
    expect($deliveryItem)->not->toBeNull();
    expect((float)$deliveryItem->quantity)->toBe(10.0);

    // Verify stock was deducted
    $finalStock = StockInHand::where('ItemKy', 'TEST-001')
        ->where('batch_no', 'BATCH001')
        ->where('section_code', 'MAIN')
        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

    expect((float)$finalStock)->toBe(90.0); // 100 - 10

    // Verify negative stock record was created
    $deductionRecord = StockInHand::where('RefNo', $delivery->delivery_number)
        ->where('TrnTyp', 'DELIVERY')
        ->first();

    expect($deductionRecord)->not->toBeNull();
    expect((float)$deductionRecord->Qty)->toBe(-10.0);
    expect($deductionRecord->ItemKy)->toBe('TEST-001');
    expect($deductionRecord->batch_no)->toBe('BATCH001');
});


test('delivery creation prevents assigning same vehicle to two routes on same date', function () {
    $company = Company::factory()->create(['company_code' => 'VT001']);
    $user = User::factory()->create(['company_code' => 'VT001', 'user_type' => 'super_admin']);
    $route1 = DeliveryRoute::create(['company_code' => 'VT001', 'name' => 'Route 1', 'is_active' => true]);
    $route2 = DeliveryRoute::create(['company_code' => 'VT001', 'name' => 'Route 2', 'is_active' => true]);
    $section = Section::create(['uuid' => 'sec1','company_code' => 'VT001','section_code' => 'MAIN','name' => 'Main']);
    $product = Product::create(['company_code' => 'VT001','ItmKy' => 1001,'ItmNm' => 'VT Product','ItemCode' => 'VTP1','section_code' => 'MAIN','fInAct'=>false,'CosPri'=>5.00,'SlsPri'=>8.00]);
    StockInHand::create(['RefNo'=>'ST-1','OrdDate'=>now()->toDateString(),'ItemKy'=>1001,'Qty'=>20,'FreeQty'=>0,'TrnTyp'=>'PURCHASE','batch_no'=>'B1','company_code'=>'VT001','owner_company_code'=>'VT001','section_code'=>'MAIN']);
    $vehicle = \App\Models\Vehicle::create(['company_code'=>'VT001','name'=>'Veh1','is_active'=>true]);
    // give the vehicle some stock so availability checks pass
    VehicleStock::create([
        'vehicle_id' => $vehicle->id,
        'item_ky' => 1001,
        'batch_no' => 'B1',
        'quantity' => 20,
        'company_code' => 'VT001',
    ]);

    /** @var \App\Models\User $user */
    actingAs($user);

    // first delivery uses vehicle on route1
    $date = now()->addDay()->toDateString();
    $first = [
        'customer_name'=>'A',
        'customer_address'=>'Addr A',
        'customer_phone'=>'000',
        'delivery_route_id'=>$route1->id,'delivery_date'=>$date,'delivery_time'=>'morning',
        'items'=>[['ItmKy'=>'1001','batch_no'=>'B1','section_code'=>'MAIN','quantity'=>1,'unit_price'=>8]],
        'vehicle_id'=>$vehicle->id
    ];

    post('/deliveries', $first)->assertRedirect('/deliveries');

    // second delivery same vehicle same date different route should fail
    $second = $first;
    $second['delivery_route_id'] = $route2->id;
    $second['customer_name'] = 'B';
    $second['customer_address'] = 'Addr B';
    $second['customer_phone'] = '111';

    $resp = post('/deliveries', $second);
    $resp->assertRedirect();
    $resp->assertSessionHasErrors('vehicle_id');
});


test('delivery creation allows same vehicle on same date if time slots differ', function () {
    $company = Company::factory()->create(['company_code' => 'VT004']);
    $user = User::factory()->create(['company_code' => 'VT004', 'user_type' => 'super_admin']);
    $route1 = DeliveryRoute::create(['company_code'=>'VT004','name'=>'R1','is_active'=>true]);
    $route2 = DeliveryRoute::create(['company_code'=>'VT004','name'=>'R2','is_active'=>true]);
    $section = Section::create(['uuid'=>'sec1','company_code'=>'VT004','section_code'=>'MAIN','name'=>'Main']);
    $product = Product::create(['company_code'=>'VT004','ItmKy' => 1002,'ItmNm' => 'VT2 Product','ItemCode' => 'VTP2','section_code' => 'MAIN','fInAct'=>false,'CosPri'=>5.00,'SlsPri'=>8.00]);
    StockInHand::create(['RefNo'=>'ST-2','OrdDate'=>now()->toDateString(),'ItemKy'=>1002,'Qty'=>20,'FreeQty'=>0,'TrnTyp'=>'PURCHASE','batch_no'=>'B1','company_code'=>'VT004','owner_company_code'=>'VT004','section_code'=>'MAIN']);
    $vehicle = \App\Models\Vehicle::create(['company_code'=>'VT004','name'=>'Veh1','is_active'=>true]);
    VehicleStock::create([
        'vehicle_id' => $vehicle->id,
        'item_ky' => 1002,
        'batch_no' => 'B1',
        'quantity' => 20,
        'company_code' => 'VT004',
    ]);

    /** @var \App\Models\User $user */
    actingAs($user);

    $date = now()->addDay()->toDateString();
    $first = [
        'customer_name'=>'A',
        'customer_address'=>'Addr A',
        'customer_phone'=>'000',
        'delivery_route_id'=>$route1->id,'delivery_date'=>$date,'delivery_time'=>'morning',
        'items'=>[['ItmKy'=>'1002','batch_no'=>'B1','section_code'=>'MAIN','quantity'=>1,'unit_price'=>8]],
        'vehicle_id'=>$vehicle->id
    ];
    post('/deliveries', $first)->assertRedirect('/deliveries');

    // second delivery same vehicle same date different route but evening time
    $second = $first;
    $second['delivery_route_id'] = $route2->id;
    $second['delivery_time'] = 'evening';
    $second['customer_name'] = 'B';
    $second['customer_address'] = 'Addr B';
    $second['customer_phone'] = '111';

    post('/deliveries', $second)->assertRedirect('/deliveries');
});


test('vehicle availability endpoint returns correct flags', function () {
    $company = Company::factory()->create(['company_code' => 'VT003']);
    $user = User::factory()->create(['company_code' => 'VT003', 'user_type' => 'super_admin']);
    $route1 = DeliveryRoute::create(['company_code'=>'VT003','name'=>'R1','is_active'=>true]);
    $route2 = DeliveryRoute::create(['company_code'=>'VT003','name'=>'R2','is_active'=>true]);
    $vehicle = \App\Models\Vehicle::create(['company_code'=>'VT003','name'=>'Veh','is_active'=>true]);
    /** @var \App\Models\User $user */
    actingAs($user);
    $date = now()->addDay()->toDateString();

    // no existing deliveries -> available
    $r1 = get("/deliveries/vehicle-availability?vehicle_id={$vehicle->id}&delivery_date={$date}&route_id={$route1->id}&delivery_time=morning");
    $r1->assertJson(['available'=>true]);

    // create a delivery using vehicle on route1
    Delivery::create([
        'delivery_number'=>'DAV1',
        'company_code'=>'VT003',
        'delivery_route_id'=>$route1->id,
        'delivery_date'=>$date,
        'delivery_time'=>'morning',
        'status'=>'assigned',
        'vehicle_id'=>$vehicle->id,
        'customer_name'=>'Test',
        'customer_address'=>'Addr',
        'customer_phone'=>'000'
    ]);

    // asking for same route should still be available
    $r2 = get("/deliveries/vehicle-availability?vehicle_id={$vehicle->id}&delivery_date={$date}&route_id={$route1->id}&delivery_time=morning");
    $r2->assertJson(['available'=>true]);

    // asking for other route should mark unavailable at the same time slot
    $r3 = get("/deliveries/vehicle-availability?vehicle_id={$vehicle->id}&delivery_date={$date}&route_id={$route2->id}&delivery_time=morning");
    $r3->assertJson(['available'=>false]);

    // if we query a different time slot it should return available
    $r4 = get("/deliveries/vehicle-availability?vehicle_id={$vehicle->id}&delivery_date={$date}&route_id={$route2->id}&delivery_time=evening");
    $r4->assertJson(['available'=>true]);
});


test('delivery update prevents switching route when vehicle already busy', function () {
    $company = Company::factory()->create(['company_code' => 'VT002']);
    $user = User::factory()->create(['company_code' => 'VT002', 'user_type' => 'super_admin']);
    $routeA = DeliveryRoute::create(['company_code'=>'VT002','name'=>'A','is_active'=>true]);
    $routeB = DeliveryRoute::create(['company_code'=>'VT002','name'=>'B','is_active'=>true]);
    $section = Section::create(['uuid'=>'secA','company_code'=>'VT002','section_code'=>'MAIN','name'=>'Main']);
    $product = Product::create(['company_code'=>'VT002','ItmKy'=>1003,'ItmNm'=>'Prod2','ItemCode'=>'P2','section_code'=>'MAIN','fInAct'=>false,'CosPri'=>5,'SlsPri'=>10]);
    StockInHand::create(['RefNo'=>'ST2','OrdDate'=>now()->toDateString(),'ItemKy'=>1003,'Qty'=>10,'FreeQty'=>0,'TrnTyp'=>'PURCHASE','batch_no'=>'B2','company_code'=>'VT002','owner_company_code'=>'VT002','section_code'=>'MAIN']);
    $vehicle = \App\Models\Vehicle::create(['company_code'=>'VT002','name'=>'V2','is_active'=>true]);
    VehicleStock::create([
        'vehicle_id' => $vehicle->id,
        'item_ky' => 1003,
        'batch_no' => 'B2',
        'quantity' => 10,
        'company_code' => 'VT002',
    ]);

    /** @var \App\Models\User $user */
    actingAs($user);
    $date = now()->addDay()->toDateString();

    // create two deliveries; both initially on routeA so there is no conflict
    $d1 = Delivery::create([
        'delivery_number'=>'D1',
        'company_code'=>'VT002',
        'customer_name' => 'First',
        'customer_address' => 'Addr1',
        'customer_phone' => '000',
        'delivery_route_id'=>$routeA->id,
        'delivery_date'=>$date,
        'delivery_time'=>'morning',
        'status'=>'assigned',
        'vehicle_id'=>$vehicle->id
    ]);
    \App\Models\DeliveryItem::create(['delivery_id'=>$d1->id,'ItmKy'=>1003,'batch_no'=>'B2','section_code'=>'MAIN','ItemCode'=>'P2','ItemName'=>'Prod2','Unit'=>'PCS','quantity'=>1,'unit_price'=>10,'total_amount'=>10]);

    $d2 = Delivery::create([
        'delivery_number'=>'D2',
        'company_code'=>'VT002',
        'customer_name' => 'Second',
        'customer_address' => 'Addr2',
        'customer_phone' => '111',
        'delivery_route_id'=>$routeA->id,
        'delivery_date'=>$date,
        'delivery_time'=>'morning',
        'status'=>'assigned',
        'vehicle_id'=>$vehicle->id
    ]);
    \App\Models\DeliveryItem::create(['delivery_id'=>$d2->id,'ItmKy'=>1003,'batch_no'=>'B2','section_code'=>'MAIN','ItemCode'=>'P2','ItemName'=>'Prod2','Unit'=>'PCS','quantity'=>1,'unit_price'=>10,'total_amount'=>10]);

    // attempt to update d2 onto routeB which should conflict because d1 is still on routeA
    $resp = put("/deliveries/{$d2->id}", [
        'customer_name'=>'test','customer_address'=>'addr','customer_phone'=>'123',
        'route_id'=>$routeB->id,'assigned_user_id'=>null,'vehicle_id'=>$vehicle->id,'delivery_date'=>$date,'delivery_time'=>'morning','status'=>'assigned',
        'items'=>[['ItmKy'=>'1003','batch_no'=>'B2','section_code'=>'MAIN','quantity'=>1,'unit_price'=>10]]
    ]);
    $resp->assertRedirect();
    $resp->assertSessionHasErrors('vehicle_id');
});

test('delivery update restores and deducts stock correctly', function () {
    $company = Company::create([
        'company_code' => 'TEST001',
        'name' => 'Test Company',
        'address' => 'Test Address',
        'phone' => '1234567890',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);
    $user = User::create([
        'company_code' => 'TEST001',
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);
    $route = DeliveryRoute::create([
        'company_code' => 'TEST001',
        'name' => 'Test Route',
        'is_active' => true,
    ]);
    $section = Section::create([
        'uuid' => 'test-uuid-123',
        'company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'name' => 'Main Section',
    ]);
    $product = Product::create([
        'company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'ItmKy' => 'TEST-001',
        'ItmNm' => 'Test Product',
        'ItemCode' => 'TP001',
        'fInAct' => false,
        'CosPri' => 10.00,
        'SlsPri' => 15.00,
    ]);

    // Add initial stock
    StockInHand::create([
        'RefNo' => 'STOCK-IN-001',
        'OrdDate' => now()->toDateString(),
        'ItemKy' => 'TEST-001',
        'Qty' => 100,
        'FreeQty' => 0,
        'TrnTyp' => 'PURCHASE',
        'batch_no' => 'BATCH001',
        'company_code' => 'TEST001',
        'owner_company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'serial_number' => null,
        'brand' => 'Test Brand',
        'model' => 'Test Model',
        'unit' => 'PCS',
        'warranty' => null,
    ]);

    actingAs($user);

    // First create a delivery
    $delivery = Delivery::create([
        'delivery_number' => 'DEL-12345',
        'customer_name' => 'Jane Doe',
        'customer_address' => '456 Test Ave',
        'customer_phone' => '+0987654321',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => null,
        'delivery_date' => now()->addDays(1)->toDateString(),
        'delivery_time' => 'afternoon',
        'priority' => 'normal',
        'notes' => 'Original delivery',
        'company_code' => 'TEST001',
        'status' => 'assigned',
    ]);

    // Create delivery item and deduct stock manually for setup
    DeliveryItem::create([
        'delivery_id' => $delivery->id,
        'ItmKy' => 'TEST-001',
        'batch_no' => 'BATCH001',
        'section_code' => 'MAIN',
        'ItemCode' => 'TP001',
        'ItemName' => 'Test Product',
        'Unit' => 'PCS',
        'quantity' => 5,
        'unit_price' => 15.00,
        'total_amount' => 75.00,
    ]);

    StockInHand::create([
        'RefNo' => 'DEL-12345',
        'OrdDate' => $delivery->delivery_date,
        'ItemKy' => 'TEST-001',
        'Qty' => -5,
        'FreeQty' => 0,
        'TrnTyp' => 'DELIVERY',
        'batch_no' => 'BATCH001',
        'company_code' => 'TEST001',
        'owner_company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'serial_number' => null,
        'brand' => null,
        'model' => null,
        'unit' => 'PCS',
        'warranty' => null,
    ]);

    // Check stock after initial delivery (100 - 5 = 95)
    $stockAfterCreate = StockInHand::where('ItemKy', 'TEST-001')
        ->where('batch_no', 'BATCH001')
        ->where('section_code', 'MAIN')
        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

    expect((float)$stockAfterCreate)->toBe(95.0);

    // Update delivery with new items (change quantity to 8)
    $updateData = [
        'customer_name' => 'Jane Doe Updated',
        'customer_address' => '456 Test Ave',
        'customer_phone' => '+0987654321',
        'route_id' => $route->id,
        'assigned_user_id' => null,
        'status' => 'assigned',
        'items' => [
            [
                'ItmKy' => 'TEST-001',
                'batch_no' => 'BATCH001',
                'section_code' => 'MAIN',
                'quantity' => 8, // Changed from 5 to 8
                'unit_price' => 15.00,
            ]
        ],
    ];

    $response = put("/deliveries/{$delivery->id}", $updateData);

    $response->assertRedirect('/deliveries');
    $response->assertSessionHas('success');

    // Verify delivery was updated
    $delivery->refresh();
    expect($delivery->customer_name)->toBe('Jane Doe Updated');

    // Verify delivery item was updated
    $deliveryItem = DeliveryItem::where('delivery_id', $delivery->id)->first();
    expect((float)$deliveryItem->quantity)->toBe(8.0);

    // Verify stock changes: restored 5, then deducted 8, so net -3 more
    $finalStock = StockInHand::where('ItemKy', 'TEST-001')
        ->where('batch_no', 'BATCH001')
        ->where('section_code', 'MAIN')
        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

    expect((float)$finalStock)->toBe(92.0); // 95 - 3 = 92

    // Verify restore record exists
    $restoreRecord = StockInHand::where('RefNo', 'DEL-12345-RESTORE')
        ->where('TrnTyp', 'DELIVERY-RESTORE')
        ->first();

    expect($restoreRecord)->not->toBeNull();
    expect((float)$restoreRecord->Qty)->toBe(5.0); // Restored the original 5

    // Verify new deduction record exists (there should be 2: original -5 and new -8)
    $newDeductionRecords = StockInHand::where('RefNo', 'DEL-12345')
        ->where('TrnTyp', 'DELIVERY')
        ->orderBy('created_at')
        ->get();

    expect($newDeductionRecords->count())->toBe(2);
    expect((float)$newDeductionRecords[0]->Qty)->toBe(-5.0); // Original
    expect((float)$newDeductionRecords[1]->Qty)->toBe(-8.0); // Updated
});

test('delivery deletion restores stock correctly', function () {
    $company = Company::create([
        'company_code' => 'TEST001',
        'name' => 'Test Company',
        'address' => 'Test Address',
        'phone' => '1234567890',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);
    $user = User::create([
        'company_code' => 'TEST001',
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);
    $route = DeliveryRoute::create([
        'company_code' => 'TEST001',
        'name' => 'Test Route',
        'is_active' => true,
    ]);
    $section = Section::create([
        'uuid' => 'test-uuid-123',
        'company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'name' => 'Main Section',
    ]);
    $product = Product::create([
        'company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'ItmKy' => 'TEST-001',
        'ItmNm' => 'Test Product',
        'ItemCode' => 'TP001',
        'fInAct' => false,
        'CosPri' => 10.00,
        'SlsPri' => 15.00,
    ]);

    // Add initial stock
    StockInHand::create([
        'RefNo' => 'STOCK-IN-001',
        'OrdDate' => now()->toDateString(),
        'ItemKy' => 'TEST-001',
        'Qty' => 100,
        'FreeQty' => 0,
        'TrnTyp' => 'PURCHASE',
        'batch_no' => 'BATCH001',
        'company_code' => 'TEST001',
        'owner_company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'serial_number' => null,
        'brand' => 'Test Brand',
        'model' => 'Test Model',
        'unit' => 'PCS',
        'warranty' => null,
    ]);

    actingAs($user);

    // Create delivery with item
    $delivery = Delivery::create([
        'delivery_number' => 'DEL-67890',
        'customer_name' => 'Bob Smith',
        'customer_address' => '789 Test Blvd',
        'customer_phone' => '+1122334455',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => null,
        'delivery_date' => now()->addDays(1)->toDateString(),
        'delivery_time' => 'evening',
        'priority' => 'high',
        'notes' => 'Delivery to delete',
        'company_code' => 'TEST001',
        'status' => 'assigned',
    ]);

    DeliveryItem::create([
        'delivery_id' => $delivery->id,
        'ItmKy' => 'TEST-001',
        'batch_no' => 'BATCH001',
        'section_code' => 'MAIN',
        'ItemCode' => 'TP001',
        'ItemName' => 'Test Product',
        'Unit' => 'PCS',
        'quantity' => 3,
        'unit_price' => 15.00,
        'total_amount' => 45.00,
    ]);

    StockInHand::create([
        'RefNo' => 'DEL-67890',
        'OrdDate' => $delivery->delivery_date,
        'ItemKy' => 'TEST-001',
        'Qty' => -3,
        'FreeQty' => 0,
        'TrnTyp' => 'DELIVERY',
        'batch_no' => 'BATCH001',
        'company_code' => 'TEST001',
        'owner_company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'serial_number' => null,
        'brand' => null,
        'model' => null,
        'unit' => 'PCS',
        'warranty' => null,
    ]);

    // Check stock before deletion (100 - 3 = 97)
    $stockBeforeDelete = StockInHand::where('ItemKy', 'TEST-001')
        ->where('batch_no', 'BATCH001')
        ->where('section_code', 'MAIN')
        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

    expect((float)$stockBeforeDelete)->toBe(97.0);

    // Delete delivery
    $response = delete("/deliveries/{$delivery->id}");

    $response->assertRedirect('/deliveries');
    $response->assertSessionHas('success');

    // Verify delivery was deleted
    expect(Delivery::find($delivery->id))->toBeNull();

    // Verify stock was restored (97 + 3 = 100)
    $finalStock = StockInHand::where('ItemKy', 'TEST-001')
        ->where('batch_no', 'BATCH001')
        ->where('section_code', 'MAIN')
        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

    expect((float)$finalStock)->toBe(100.0);

    // Verify restore record exists
    $restoreRecord = StockInHand::where('RefNo', 'DEL-67890-RESTORE')
        ->where('TrnTyp', 'DELIVERY-RESTORE')
        ->first();

    expect($restoreRecord)->not->toBeNull();
    expect((float)$restoreRecord->Qty)->toBe(3.0);
});

test('delivery creation fails with insufficient stock', function () {
    $company = Company::create([
        'company_code' => 'TEST001',
        'name' => 'Test Company',
        'address' => 'Test Address',
        'phone' => '1234567890',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'is_active' => true,
    ]);
    $user = User::create([
        'company_code' => 'TEST001',
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);
    $route = DeliveryRoute::create([
        'company_code' => 'TEST001',
        'name' => 'Test Route',
        'is_active' => true,
    ]);
    $section = Section::create([
        'uuid' => 'test-uuid-123',
        'company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'name' => 'Main Section',
    ]);
    $product = Product::create([
        'company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'ItmKy' => 'TEST-001',
        'ItmNm' => 'Test Product',
        'ItemCode' => 'TP001',
        'fInAct' => false,
        'CosPri' => 10.00,
        'SlsPri' => 15.00,
    ]);

    // Add initial stock (only 50, not 150)
    StockInHand::create([
        'RefNo' => 'STOCK-IN-001',
        'OrdDate' => now()->toDateString(),
        'ItemKy' => 'TEST-001',
        'Qty' => 50,
        'FreeQty' => 0,
        'TrnTyp' => 'PURCHASE',
        'batch_no' => 'BATCH001',
        'company_code' => 'TEST001',
        'owner_company_code' => 'TEST001',
        'section_code' => 'MAIN',
        'serial_number' => null,
        'brand' => 'Test Brand',
        'model' => 'Test Model',
        'unit' => 'PCS',
        'warranty' => null,
    ]);

    actingAs($user);

    // Try to create delivery with more quantity than available
    $deliveryData = [
        'customer_name' => 'Insufficient Stock',
        'customer_address' => '123 Test Street',
        'customer_phone' => '+1234567890',
        'delivery_route_id' => $route->id,
        'assigned_user_id' => null,
        'delivery_date' => now()->addDays(1)->toDateString(),
        'delivery_time' => 'morning',
        'priority' => 'normal',
        'notes' => 'Test delivery',
        'items' => [
            [
                'ItmKy' => 'TEST-001',
                'batch_no' => 'BATCH001',
                'section_code' => 'MAIN',
                'quantity' => 60, // More than available 50
                'unit_price' => 15.00,
            ]
        ],
    ];

    $response = post('/deliveries', $deliveryData);

    $response->assertRedirect();
    $response->assertSessionHasErrors('items');

    // Verify no delivery was created
    expect(Delivery::where('customer_name', 'Insufficient Stock')->first())->toBeNull();

    // Verify stock unchanged
    $finalStock = StockInHand::where('ItemKy', 'TEST-001')
        ->where('batch_no', 'BATCH001')
        ->where('section_code', 'MAIN')
        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

    expect((float)$finalStock)->toBe(50.0);
});

test('delivery receipt page renders and contains delivery details', function () {
    $company = Company::create([
        'company_code' => 'TEST004',
        'name' => 'Receipt Co',
        'address' => 'Addr',
        'phone' => '000',
        'email' => 'r@r.com',
        'password' => bcrypt('pw'),
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => 'TEST004',
        'first_name' => 'Receipt',
        'last_name' => 'User',
        'email' => 'receipt@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $route = DeliveryRoute::create(['company_code' => 'TEST004', 'name' => 'R1', 'is_active' => true]);

    $section = Section::create([
        'uuid' => 'sec-rcpt-1',
        'company_code' => 'TEST004',
        'section_code' => 'MAIN',
        'name' => 'Main',
    ]);

    $product = Product::create([
        'company_code' => 'TEST004',
        'section_code' => 'MAIN',
        'ItmKy' => 'RCPT-001',
        'ItmNm' => 'Receipt Product',
        'ItemCode' => 'RP001',
        'fInAct' => false,
        'CosPri' => 10.00,
        'SlsPri' => 15.00,
    ]);

    StockInHand::create([
        'RefNo' => 'STOCK-IN-R1',
        'OrdDate' => now()->toDateString(),
        'ItemKy' => 'RCPT-001',
        'Qty' => 50,
        'FreeQty' => 0,
        'TrnTyp' => 'PURCHASE',
        'batch_no' => 'BATCH-R1',
        'company_code' => 'TEST004',
        'owner_company_code' => 'TEST004',
        'section_code' => 'MAIN',
        'serial_number' => null,
        'brand' => null,
        'model' => null,
        'unit' => 'PCS',
        'warranty' => null,
    ]);

    actingAs($user);

    $delivery = Delivery::create([
        'delivery_number' => 'DEL-RECP-1',
        'customer_name' => 'Receipt Customer',
        'customer_address' => 'Addr',
        'customer_phone' => '0111111111',
        'delivery_route_id' => $route->id,
        'company_code' => 'TEST004',
        'status' => 'assigned',
    ]);

    \App\Models\DeliveryItem::create([
        'delivery_id' => $delivery->id,
        'ItmKy' => 'RCPT-001',
        'batch_no' => 'BATCH-R1',
        'section_code' => 'MAIN',
        'ItemCode' => 'RP001',
        'ItemName' => 'Receipt Product',
        'Unit' => 'PCS',
        'quantity' => 2,
        'unit_price' => 15.00,
        'total_amount' => 30.00,
    ]);

    $response = get("/deliveries/{$delivery->id}/receipt");
    $response->assertStatus(200);
    $response->assertSee('DEL-RECP-1');
    $response->assertSee('Receipt Customer');
    $response->assertSee('Receipt Product');
});
