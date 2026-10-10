<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\DeliveryItem;
use App\Models\DeliveryPayment;
use App\Models\Product;
use App\Models\Role;
use App\Models\Section;
use App\Models\Shop;
use App\Models\ShopReturn;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleStock;
use App\Models\Company;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class DeliveryIntegrityTest extends TestCase
{
    use DatabaseTransactions;

    protected string $companyCode;
    protected User $user;
    protected Section $section;
    protected Product $product;
    protected Vehicle $vehicle;

    protected function setUp(): void
    {
        parent::setUp();
        $this->companyCode = 'TEST-CO';

        Company::create([
            'company_code' => $this->companyCode,
            'name' => 'Test Company',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->user = User::factory()->create(['company_code' => $this->companyCode]);

        // Assign permissions
        $role = Role::create(['name' => 'Admin', 'slug' => 'admin', 'level' => 'company_admin']);
        $this->user->role_id = $role->id;
        $this->user->save();

        $permissions = ['deliveries.view', 'deliveries.create', 'deliveries.edit', 'deliveries.delete', 'deliveries.update_status'];
        foreach ($permissions as $perm) {
            $permission = \App\Models\Permission::firstOrCreate(
                ['slug' => $perm],
                ['name' => $perm, 'uuid' => (string) Str::uuid()]
            );
            $role->permissions()->syncWithoutDetaching([$permission->id]);
        }

        $this->section = Section::create([
            'name' => 'Main Warehouse',
            'section_code' => 'MAIN-001',
            'company_code' => $this->companyCode,
            'is_main_stock' => true,
            'uuid' => (string) Str::uuid(),
        ]);

        $this->product = Product::factory()->create([
            'company_code' => $this->companyCode,
            'ItmKy' => 5001,
            'ItemCode' => 'P5001',
            'ItmNm' => 'Integrity Test Product',
            'Unit' => 'PCS',
            'fInAct' => false
        ]);

        $this->vehicle = Vehicle::create([
            'name' => 'Test Van',
            'company_code' => $this->companyCode
        ]);

        $this->route = \App\Models\DeliveryRoute::create([
            'name' => 'Test Route',
            'company_code' => $this->companyCode,
            'is_active' => true
        ]);
    }

    public function test_it_prevents_cancelling_a_delivery_that_has_payments()
    {
        $delivery = Delivery::factory()->create([
            'delivery_number' => 'DEL-PAY-1',
            'company_code' => $this->companyCode,
            'status' => 'assigned',
            'delivery_route_id' => $this->route->id
        ]);

        \App\Models\DeliveryPayment::factory()->create([
            'delivery_id' => $delivery->id,
            'amount' => 100,
            'status' => 'cleared',
            'company_code' => $this->companyCode
        ]);

        $this->actingAs($this->user);

        $response = $this->patch(route('delivery.update-status', $delivery->id), [
            'status' => 'cancelled'
        ]);

        $response->assertSessionHas('error');
        $this->assertEquals('assigned', $delivery->fresh()->status);
    }

    public function test_it_prevents_deleting_a_delivery_that_has_payments()
    {
        $delivery = Delivery::factory()->create([
            'delivery_number' => 'DEL-PAY-2',
            'company_code' => $this->companyCode,
            'status' => 'assigned',
            'delivery_route_id' => $this->route->id
        ]);

        \App\Models\DeliveryPayment::factory()->create([
            'delivery_id' => $delivery->id,
            'amount' => 100,
            'status' => 'cleared',
            'company_code' => $this->companyCode
        ]);

        $this->actingAs($this->user);

        $response = $this->delete(route('delivery.destroy', $delivery->id));

        $response->assertSessionHas('error');
        $this->assertDatabaseHas('deliveries', ['id' => $delivery->id]);
    }

    public function test_it_does_not_restore_stock_if_cancelled_from_delivered_status()
    {
        $product = Product::factory()->create([
            'company_code' => $this->companyCode,
            'ItmKy' => 5003,
            'ItemCode' => 'P5003',
            'ItmNm' => 'Test 3',
            'Unit' => 'PCS',
            'fInAct' => false
        ]);

        // 1. Setup Vehicle Stock (10 units)
        VehicleStock::create([
            'vehicle_id' => $this->vehicle->id,
            'item_ky' => $product->ItmKy,
            'batch_no' => 'B1',
            'quantity' => 10,
            'delivered_quantity' => 0,
            'company_code' => $this->companyCode,
            'last_date' => now()
        ]);

        // 2. Create Delivery and set to 'delivered'
        $delivery = Delivery::factory()->create([
            'delivery_number' => 'DEL-TEST-1',
            'company_code' => $this->companyCode,
            'status' => 'delivered',
            'vehicle_id' => $this->vehicle->id,
            'delivery_route_id' => $this->route->id
        ]);

        DeliveryItem::create([
            'delivery_id' => $delivery->id,
            'ItmKy' => $product->ItmKy,
            'ItemCode' => $product->ItemCode,
            'ItemName' => $product->ItmNm,
            'batch_no' => 'B1',
            'quantity' => 5,
            'section_code' => $this->section->section_code,
            'unit_price' => 10,
            'total_amount' => 50
        ]);

        // Manual deduction to simulate 'delivered' state
        $vs = VehicleStock::where('item_ky', 5003)->first();
        $vs->decrement('quantity', 5);
        $vs->increment('delivered_quantity', 5);

        $this->actingAs($this->user);

        // 3. Cancel the delivery
        $this->patch(route('delivery.update-status', $delivery->id), [
            'status' => 'cancelled'
        ]);

        // 4. Verify stock was NOT returned (quantity should still be 5, not 10)
        $vs = $vs->fresh();
        $this->assertEquals(5, (float)$vs->quantity);
        $this->assertEquals(5, (float)$vs->delivered_quantity);
    }

    public function test_it_restores_stock_if_cancelled_from_assigned_status()
    {
        $product = Product::factory()->create([
            'company_code' => $this->companyCode,
            'ItmKy' => 5004,
            'ItemCode' => 'P5004',
            'ItmNm' => 'Test 4',
            'Unit' => 'PCS',
            'fInAct' => false
        ]);

        VehicleStock::create([
            'vehicle_id' => $this->vehicle->id,
            'item_ky' => $product->ItmKy,
            'batch_no' => 'B1',
            'quantity' => 5,
            'delivered_quantity' => 5,
            'company_code' => $this->companyCode,
            'last_date' => now()
        ]);

        $delivery = Delivery::factory()->create([
            'delivery_number' => 'DEL-TEST-2',
            'company_code' => $this->companyCode,
            'status' => 'assigned',
            'vehicle_id' => $this->vehicle->id,
            'delivery_route_id' => $this->route->id
        ]);

        DeliveryItem::create([
            'delivery_id' => $delivery->id,
            'ItmKy' => $product->ItmKy,
            'ItemCode' => $product->ItemCode,
            'ItemName' => $product->ItmNm,
            'batch_no' => 'B1',
            'quantity' => 5,
            'section_code' => $this->section->section_code,
            'unit_price' => 10,
            'total_amount' => 50
        ]);

        $this->actingAs($this->user);

        // Cancel
        $this->patch(route('delivery.update-status', $delivery->id), ['status' => 'cancelled']);

        // Verify stock returned (5 + 5 = 10)
        $vs = VehicleStock::where('item_ky', 5004)->first();
        $this->assertEquals(10, (float)$vs->quantity);
        $this->assertEquals(0, (float)$vs->delivered_quantity);
    }

    public function test_it_re_deducts_stock_when_un_cancelled()
    {
        $product = Product::factory()->create([
            'company_code' => $this->companyCode,
            'ItmKy' => 5005,
            'ItemCode' => 'P5005',
            'ItmNm' => 'Test 5',
            'Unit' => 'PCS',
            'fInAct' => false
        ]);

        // 1. Setup Vehicle with 10 units
        VehicleStock::create([
            'vehicle_id' => $this->vehicle->id,
            'item_ky' => $product->ItmKy,
            'batch_no' => 'B1',
            'quantity' => 10,
            'delivered_quantity' => 0,
            'company_code' => $this->companyCode,
            'last_date' => now()
        ]);

        $delivery = Delivery::factory()->create([
            'delivery_number' => 'DEL-TEST-3',
            'company_code' => $this->companyCode,
            'status' => 'cancelled', // Start as cancelled
            'vehicle_id' => $this->vehicle->id,
            'delivery_route_id' => $this->route->id
        ]);

        DeliveryItem::create([
            'delivery_id' => $delivery->id,
            'ItmKy' => $product->ItmKy,
            'ItemCode' => $product->ItemCode,
            'ItemName' => $product->ItmNm,
            'batch_no' => 'B1',
            'quantity' => 4,
            'section_code' => $this->section->section_code,
            'unit_price' => 10,
            'total_amount' => 40
        ]);

        $this->actingAs($this->user);

        // 2. Un-cancel (move to assigned)
        $this->patch(route('delivery.update-status', $delivery->id), ['status' => 'assigned']);

        // 3. Verify stock re-deducted (10 - 4 = 6)
        $vs = VehicleStock::where('item_ky', 5005)->first();
        $this->assertEquals(6, (float)$vs->quantity);
        $this->assertEquals(4, (float)$vs->delivered_quantity);
    }

    public function test_it_rolls_back_status_change_if_un_cancellation_fails_due_to_stock()
    {
        $product = Product::factory()->create([
            'company_code' => $this->companyCode,
            'ItmKy' => 5006,
            'ItemCode' => 'P5006',
            'ItmNm' => 'Test 6',
            'Unit' => 'PCS',
            'fInAct' => false
        ]);

        // 1. Vehicle has 2 units
        VehicleStock::create([
            'vehicle_id' => $this->vehicle->id,
            'item_ky' => $product->ItmKy,
            'batch_no' => 'B1',
            'quantity' => 2,
            'delivered_quantity' => 0,
            'company_code' => $this->companyCode,
            'last_date' => now()
        ]);

        // 2. Delivery for 5 units is currently 'cancelled'
        $delivery = Delivery::factory()->create([
            'delivery_number' => 'DEL-TEST-4',
            'company_code' => $this->companyCode,
            'status' => 'cancelled',
            'vehicle_id' => $this->vehicle->id,
            'delivery_route_id' => $this->route->id
        ]);

        DeliveryItem::create([
            'delivery_id' => $delivery->id,
            'ItmKy' => $product->ItmKy,
            'ItemCode' => $product->ItemCode,
            'ItemName' => $product->ItmNm,
            'batch_no' => 'B1',
            'quantity' => 5, // Requires 5, but only 2 available
            'section_code' => $this->section->section_code,
            'unit_price' => 10,
            'total_amount' => 50
        ]);

        $this->actingAs($this->user);

        // 3. Attempt to Un-cancel
        $response = $this->patch(route('delivery.update-status', $delivery->id), ['status' => 'assigned']);

        // 4. Verify failure and rollback
        $response->assertSessionHas('error');
        $this->assertEquals('cancelled', $delivery->fresh()->status);
        $this->assertEquals(2, (float)VehicleStock::where('item_ky', 5006)->first()->quantity); // Stock remains 2
    }
    public function test_it_handles_shop_returns_correctly()
    {
        // 1. Setup: Product 5007 on Vehicle with 10 units, then deliver 5
        $product = Product::factory()->create([
            'company_code' => $this->companyCode,
            'ItmKy' => 5007,
            'ItemCode' => 'P5007',
            'ItmNm' => 'Test 7',
            'Unit' => 'PCS',
            'fInAct' => false
        ]);

        $shop = Shop::create([
            'company_code' => $this->companyCode,
            'name' => 'Test Shop',
            'is_active' => true
        ]);

        VehicleStock::create([
            'vehicle_id' => $this->vehicle->id,
            'item_ky' => $product->ItmKy,
            'batch_no' => 'B1',
            'quantity' => 5,
            'delivered_quantity' => 5,
            'company_code' => $this->companyCode,
            'last_date' => now()
        ]);

        $delivery = Delivery::factory()->create([
            'delivery_number' => 'DEL-RET-1',
            'company_code' => $this->companyCode,
            'status' => 'delivered',
            'vehicle_id' => $this->vehicle->id,
            'delivery_route_id' => $this->route->id,
            'shop_id' => $shop->id
        ]);

        $dItem = DeliveryItem::create([
            'delivery_id' => $delivery->id,
            'ItmKy' => $product->ItmKy,
            'ItemCode' => $product->ItemCode,
            'ItemName' => $product->ItmNm,
            'batch_no' => 'B1',
            'quantity' => 5,
            'section_code' => $this->section->section_code,
            'unit_price' => 10,
            'total_amount' => 50
        ]);

        $this->actingAs($this->user);

        // 2. Perform Shop Return (return 3 units)
        $response = $this->post('/deliveries/returns', [
            'shop_id' => $delivery->shop_id,
            'vehicle_id' => $this->vehicle->id,
            'delivery_id' => $delivery->id,
            'return_date' => now()->toDateString(),
            'items' => [
                [
                    'item_ky' => (string)$product->ItmKy,
                    'batch_no' => 'B1',
                    'quantity' => 3,
                    'unit_price' => 10
                ]
            ]
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasNoErrors();
        $this->assertEquals(1, ShopReturn::count());

        // 3. Verify:
        // - DeliveryItem quantity should be 5 - 3 = 2
        $updatedItem = DeliveryItem::where('delivery_id', $delivery->id)->where('ItmKy', $product->ItmKy)->first();
        $this->assertNotNull($updatedItem);
        $this->assertEquals(2, (float)$updatedItem->quantity);

        // - VehicleStock quantity should be 5 + 3 = 8
        $vs = VehicleStock::where('item_ky', $product->ItmKy)
            ->where('vehicle_id', $this->vehicle->id)
            ->first();
        
        $this->assertNotNull($vs);
        $this->assertEquals(8, (float)$vs->quantity);

        // 4. Test Over-Return (try to return 5 more, but only 2 left)
        $response = $this->post('/deliveries/returns', [
            'shop_id' => $delivery->shop_id,
            'vehicle_id' => $this->vehicle->id,
            'delivery_id' => $delivery->id,
            'return_date' => now()->toDateString(),
            'items' => [
                [
                    'item_ky' => (string)$product->ItmKy,
                    'batch_no' => 'B1',
                    'quantity' => 5,
                    'unit_price' => 10
                ]
            ]
        ]);

        $response->assertSessionHas('error');
        $this->assertEquals(2, (float)$dItem->fresh()->quantity); // Should still be 2
    }
}
