<?php

namespace Tests\Feature;

/**
 * @mixin \Illuminate\Foundation\Testing\TestCase
 * @noinspection PhpUndefinedFieldInspection
 * @noinspection PhpUndefinedVariableInspection
 * @noinspection PhpUndefinedMethodInspection
 */

use App\Models\Delivery;
use App\Models\DeliveryRoute;
use App\Models\Product;
use App\Models\Role;
use App\Models\Section;
use App\Models\StockInHand;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleStock;
use App\Models\Company;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Str;

class DeliveryStockTest extends TestCase
{
    use DatabaseTransactions;

    protected string $companyCode;
    protected User $user;
    protected Section $section;
    protected Product $product;
    protected DeliveryRoute $route;

    protected function setUp(): void
    {
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

        // Grant all necessary permissions
        $permissions = ['deliveries.view', 'deliveries.create', 'deliveries.edit', 'deliveries.delete'];
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

        // Ensure Product ItmKy is used correctly
        $this->product = Product::factory()->create([
            'company_code' => $this->companyCode,
            'ItmKy' => 1001,
            'ItemCode' => 'P001',
            'ItmNm' => 'Test Product',
            'Unit' => 'PCS',
            'fInAct' => false
        ]);

        $this->route = DeliveryRoute::create([
            'name' => 'Route A',
            'company_code' => $this->companyCode,
            'is_active' => true
        ]);
    }

    public function test_it_deducts_stock_from_warehouse_when_no_vehicle_selected(): void
    {
        // 1. Setup initial warehouse stock
        StockInHand::create([
            'RefNo' => 'OP-001',
            'ItemKy' => $this->product->ItmKy,
            'Qty' => 50,
            'company_code' => $this->companyCode,
            'owner_company_code' => $this->companyCode, // Added
            'section_code' => $this->section->section_code,
            'batch_no' => 'B001',
            'OrdDate' => now(),
        ]);

        $this->actingAs($this->user);

        // 2. Create delivery
        $response = $this->post(route('delivery.store'), [
            'customer_name' => 'John Doe',
            'customer_address' => '123 St',
            'customer_phone' => '555-0101',
            'delivery_route_id' => $this->route->id,
            'delivery_date' => now()->addDay()->toDateString(),
            'items' => [
                [
                    'ItmKy' => (string) $this->product->ItmKy,
                    'batch_no' => 'B001',
                    'section_code' => $this->section->section_code,
                    'quantity' => 10,
                    'unit_price' => 100,
                ]
            ]
        ]);

        $response->assertRedirect(route('delivery.index'));

        // 3. Verify stock deduction in StockInHand
        // We expect a new entry with Qty = -10
        $this->assertDatabaseHas('stock_in_hand', [
            'ItemKy' => $this->product->ItmKy,
            'Qty' => -10,
            'TrnTyp' => 'DELIVERY',
            'section_code' => $this->section->section_code,
        ]);

        // Verify net stock is now 40
        $remaining = StockInHand::where('ItemKy', $this->product->ItmKy)
            ->where('section_code', $this->section->section_code)
            ->sum('Qty');

        expect((float)$remaining)->toEqual(40.0);
    }

    public function test_it_deducts_stock_from_vehicle_when_vehicle_selected(): void
    {
        $vehicle = Vehicle::create(['name' => 'Van 1', 'company_code' => $this->companyCode]);

        // 1. Setup vehicle stock
        VehicleStock::create([
            'vehicle_id' => $vehicle->id,
            'item_ky' => $this->product->ItmKy,
            'batch_no' => 'B001',
            'quantity' => 50,
            'company_code' => $this->companyCode,
            'last_date' => now(),
        ]);

        $this->actingAs($this->user);

        // 2. Create delivery from Vehicle
        $response = $this->post(route('delivery.store'), [
            'customer_name' => 'Jane Doe',
            'customer_address' => '456 Ave',
            'customer_phone' => '555-0202',
            'delivery_route_id' => $this->route->id,
            'vehicle_id' => $vehicle->id,
            'delivery_date' => now()->addDay()->toDateString(),
            'items' => [
                [
                    'ItmKy' => (string) $this->product->ItmKy,
                    'batch_no' => 'B001',
                    'section_code' => $this->section->section_code,
                    'quantity' => 5,
                    'unit_price' => 100,
                ]
            ]
        ]);

        $response->assertRedirect(route('delivery.index'));

        // 3. Verify Vehicle Stock deduction
        $this->assertDatabaseHas('vehicle_stocks', [
            'vehicle_id' => $vehicle->id,
            'item_ky' => $this->product->ItmKy,
            'quantity' => 45, // 50 - 5
        ]);

        // 4. Verify StockInHand movement recorded (as V-DEL)
        $this->assertDatabaseHas('stock_in_hand', [
            'vehicle_id' => $vehicle->id,
            'TrnTyp' => 'V-DEL',
            'Qty' => -5,
        ]);
    }

    public function test_it_fails_creation_if_warehouse_stock_insufficient(): void
    {
        // Stock is 0 by default

        $this->actingAs($this->user);

        $response = $this->post(route('delivery.store'), [
            'customer_name' => 'John Doe',
            'customer_address' => '123 St',
            'customer_phone' => '555-0101',
            'delivery_route_id' => $this->route->id,
            'delivery_date' => now()->addDay()->toDateString(),
            'items' => [
                [
                    'ItmKy' => (string) $this->product->ItmKy,
                    'batch_no' => 'B001',
                    'section_code' => $this->section->section_code,
                    'quantity' => 10,
                    'unit_price' => 100,
                ]
            ]
        ]);

        $response->assertSessionHasErrors('items');
    }

    public function test_it_fails_creation_if_vehicle_stock_insufficient(): void
    {
        $vehicle = Vehicle::create(['name' => 'Van 2', 'company_code' => $this->companyCode]);

        // Vehicle Stock is 0 by default

        $this->actingAs($this->user);

        $response = $this->post(route('delivery.store'), [
            'customer_name' => 'John Doe',
            'customer_address' => '123 St',
            'customer_phone' => '555-0101',
            'delivery_route_id' => $this->route->id,
            'vehicle_id' => $vehicle->id,
            'delivery_date' => now()->addDay()->toDateString(),
            'items' => [
                [
                    'ItmKy' => (string) $this->product->ItmKy,
                    'batch_no' => 'B001',
                    'section_code' => $this->section->section_code,
                    'quantity' => 10,
                    'unit_price' => 100,
                ]
            ]
        ]);

        $response->assertSessionHasErrors('items');
    }

    // when two lines refer to the same batch, their quantities should be summed
    // and validation should still catch excess

    public function test_it_fails_creation_if_combined_duplicates_exceed_vehicle_stock(): void
    {
        $vehicle = Vehicle::create(['name' => 'Van 4', 'company_code' => $this->companyCode]);
        VehicleStock::create([
            'vehicle_id' => $vehicle->id,
            'item_ky' => $this->product->ItmKy,
            'batch_no' => 'B001',
            'quantity' => 5,
            'company_code' => $this->companyCode,
            'last_date' => now(),
        ]);

        $this->actingAs($this->user);

        $response = $this->post(route('delivery.store'), [
            'customer_name' => 'Bob',
            'customer_address' => '789 St',
            'customer_phone' => '555-0404',
            'delivery_route_id' => $this->route->id,
            'vehicle_id' => $vehicle->id,
            'delivery_date' => now()->addDay()->toDateString(),
            'items' => [
                [
                    'ItmKy' => (string) $this->product->ItmKy,
                    'batch_no' => 'B001',
                    'section_code' => $this->section->section_code,
                    'quantity' => 3,
                    'unit_price' => 50,
                ],
                [
                    'ItmKy' => (string) $this->product->ItmKy,
                    'batch_no' => 'B001',
                    'section_code' => $this->section->section_code,
                    'quantity' => 3,
                    'unit_price' => 50,
                ],
            ],
        ]);

        $response->assertSessionHasErrors('items');
    }

    // ensure update validates vehicle stock and doesn't crash with 500
    // scenario: vehicle had limited quantity, delivery consumed some, then update tries to exceed remaining + returned quantity

    public function test_it_fails_update_if_vehicle_stock_insufficient(): void
    {
        $vehicle = Vehicle::create(['name' => 'Van 5', 'company_code' => $this->companyCode]);

        // initial vehicle stock = 15
        VehicleStock::create([
            'vehicle_id' => $vehicle->id,
            'item_ky' => $this->product->ItmKy,
            'batch_no' => 'B001',
            'quantity' => 15,
            'company_code' => $this->companyCode,
            'last_date' => now(),
        ]);

        $this->actingAs($this->user);

        // create delivery with qty 10 (stock left = 5)
        $response = $this->post(route('delivery.store'), [
            'customer_name' => 'Alice',
            'customer_address' => '789 Road',
            'customer_phone' => '555-0303',
            'delivery_route_id' => $this->route->id,
            'vehicle_id' => $vehicle->id,
            'delivery_date' => now()->addDay()->toDateString(),
            'items' => [
                [
                    'ItmKy' => (string) $this->product->ItmKy,
                    'batch_no' => 'B001',
                    'section_code' => $this->section->section_code,
                    'quantity' => 10,
                    'unit_price' => 50,
                ]
            ]
        ]);
        $response->assertRedirect(route('delivery.index'));

        $delivery = Delivery::first();
        expect($delivery)->not->toBeNull();

        // attempt update to quantity 30 -> after restoration stock = 15 (5 left + 10 returned), deduction 30 should fail
        $updateResponse = $this->put(route('delivery.update', $delivery->id), [
            'customer_name' => 'Alice',
            'customer_address' => '789 Road',
            'customer_phone' => '555-0303',
            'route_id' => $delivery->delivery_route_id,
            'assigned_user_id' => null,
            'vehicle_id' => $vehicle->id,
            'delivery_date' => $delivery->delivery_date,
            'delivery_time' => $delivery->delivery_time,
            'priority' => $delivery->priority,
            'status' => $delivery->status,
            'notes' => $delivery->notes,
            'items' => [
                [
                    'ItmKy' => (string) $this->product->ItmKy,
                    'batch_no' => 'B001',
                    'section_code' => $this->section->section_code,
                    'quantity' => 30,
                    'unit_price' => 50,
                ],
            ],
        ]);

        $updateResponse->assertSessionHasErrors('items');
    }

    public function test_it_restores_stock_to_warehouse_on_delete_when_delivered_from_warehouse(): void
    {
        // 1. Initial Stock: 50
        StockInHand::create([
            'RefNo' => 'OP-001',
            'ItemKy' => $this->product->ItmKy,
            'Qty' => 50,
            'company_code' => $this->companyCode,
            'owner_company_code' => $this->companyCode, // Added
            'section_code' => $this->section->section_code,
            'batch_no' => 'B001',
            'OrdDate' => now(),
        ]);

        $this->actingAs($this->user);

        // 2. Create Delivery (Qty: 10)
        $this->post(route('delivery.store'), [
            'customer_name' => 'John Doe',
            'customer_address' => '123 St',
            'customer_phone' => '555',
            'delivery_route_id' => $this->route->id,
            'delivery_date' => now()->addDay()->toDateString(),
            'items' => [
                ['ItmKy' => (string) $this->product->ItmKy, 'batch_no' => 'B001', 'section_code' => $this->section->section_code, 'quantity' => 10, 'unit_price' => 100]
            ]
        ]);

        $delivery = Delivery::first();

        // 3. Delete Delivery
        $this->delete(route('delivery.destroy', $delivery->id));

        // 4. Verify Stock Restored
        // We expect a restoration entry
        $this->assertDatabaseHas('stock_in_hand', [
            'ItemKy' => $this->product->ItmKy,
            'TrnTyp' => 'DELIVERY-RESTORE',
            'Qty' => 10,
        ]);

        // Net stock should be 50 again (50 - 10 + 10)
        $remaining = StockInHand::where('ItemKy', $this->product->ItmKy)
            ->where('section_code', $this->section->section_code)
            ->sum('Qty');

        expect((float)$remaining)->toEqual(50.0);
    }

    public function test_it_restores_stock_to_vehicle_on_delete_when_delivered_from_vehicle(): void
    {
        $vehicle = Vehicle::create(['name' => 'Van 3', 'company_code' => $this->companyCode]);

        // 1. Initial Vehicle Stock: 50
        VehicleStock::create([
            'vehicle_id' => $vehicle->id,
            'item_ky' => $this->product->ItmKy,
            'batch_no' => 'B001',
            'quantity' => 50,
            'company_code' => $this->companyCode,
            'last_date' => now(),
        ]);

        $this->actingAs($this->user);

        // 2. Create Delivery (Qty: 10) from Vehicle
        $this->post(route('delivery.store'), [
            'customer_name' => 'John Doe',
            'customer_address' => '123 St',
            'customer_phone' => '555',
            'delivery_route_id' => $this->route->id,
            'vehicle_id' => $vehicle->id,
            'delivery_date' => now()->addDay()->toDateString(),
            'items' => [
                ['ItmKy' => (string) $this->product->ItmKy, 'batch_no' => 'B001', 'section_code' => $this->section->section_code, 'quantity' => 10, 'unit_price' => 100]
            ]
        ]);

        $delivery = Delivery::first();

        // Check stock was deducted
        $stock = VehicleStock::where('vehicle_id', $vehicle->id)->where('item_ky', $this->product->ItmKy)->first();
        expect((float)$stock->quantity)->toEqual(40.0);
        expect((float)$stock->delivered_quantity)->toEqual(10.0);

        // 3. Delete Delivery
        $this->delete(route('delivery.destroy', $delivery->id));

        // 4. Verify Vehicle Stock Restored
        // quantity should move back to original 50
        $stockFresh = VehicleStock::where('vehicle_id', $vehicle->id)->where('item_ky', $this->product->ItmKy)->first();
        expect((float)$stockFresh->quantity)->toEqual(50.0);
        expect((float)$stockFresh->delivered_quantity)->toEqual(0.0);
    }

    public function test_cancelled_delivery_restores_vehicle_stock_and_delivered_quantity(): void
    {
        $vehicle = Vehicle::create(['name' => 'Van 4', 'company_code' => $this->companyCode]);

        VehicleStock::create([
            'vehicle_id' => $vehicle->id,
            'item_ky' => $this->product->ItmKy,
            'batch_no' => 'B002',
            'quantity' => 20,
            'company_code' => $this->companyCode,
            'last_date' => now(),
        ]);

        $this->actingAs($this->user);

        // create a delivery of 5 units from vehicle
        $this->post(route('delivery.store'), [
            'customer_name' => 'Jane Doe',
            'customer_address' => '456 St',
            'customer_phone' => '777',
            'delivery_route_id' => $this->route->id,
            'vehicle_id' => $vehicle->id,
            'delivery_date' => now()->toDateString(),
            'items' => [
                ['ItmKy' => (string) $this->product->ItmKy, 'batch_no' => 'B002', 'section_code' => $this->section->section_code, 'quantity' => 5, 'unit_price' => 50]
            ]
        ]);

        $delivery = Delivery::first();

        // confirm initial deduction
        $stock = VehicleStock::where('vehicle_id', $vehicle->id)->where('item_ky', $this->product->ItmKy)->first();
        expect((float)$stock->quantity)->toEqual(15.0);
        expect((float)$stock->delivered_quantity)->toEqual(5.0);

        // cancel the delivery
        $this->patch(route('delivery.update-status', $delivery->id), ['status' => 'cancelled']);

        // reload and verify stock + delivered counter
        $stock = $stock->fresh();
        expect((float)$stock->quantity)->toEqual(20.0);
        expect((float)$stock->delivered_quantity)->toEqual(0.0);
    }
}
