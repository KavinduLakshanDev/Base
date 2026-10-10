<?php

namespace Tests\Feature;

use App\Models\CodeMaster;
use App\Models\Company;
use App\Models\Product;
use App\Models\Section;
use App\Models\StockInHand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StockTransferStockTest extends TestCase
{
    use RefreshDatabase;

    private function createUnits(string $companyCode): array
    {
        DB::table('control_masters')->updateOrInsert(
            ['conkey' => 'UNT'],
            [
                'concode' => 'UNT',
                'conname' => 'Unit',
                'company_code' => $companyCode,
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $bundle = CodeMaster::create([
            'conkey' => 'UNT',
            'concode' => 'BUNDLE',
            'catkey' => 'UNT',
            'cname'  => 'Bundle',
            'company_code' => $companyCode,
            'is_active' => true,
        ]);
        $nos = CodeMaster::create([
            'conkey' => 'UNT',
            'concode' => 'NOS',
            'catkey' => 'UNT',
            'cname'  => 'Nos',
            'company_code' => $companyCode,
            'is_active' => true,
        ]);

        return [$bundle->id, $nos->id];
    }

    private function makeStock($product, $section, $qty = 100)
    {
        return StockInHand::factory()->create([
            'company_code' => $product->company_code,
            'owner_company_code' => $product->company_code,
            'section_code' => $section->section_code,
            'ItemKy'       => $product->ItmKy,
            'Qty'          => $qty,
            'FreeQty'      => 0,   // override factory default (random 0-10) to keep maths predictable
            'batch_no'     => null, // explicit null for predictable NULL grouping
            'TrnTyp'       => 'ADJ',
        ]);
    }

    public function test_get_product_stock_returns_simple_sum_when_no_conversion_history()
    {
        $user = User::factory()->create(['user_type' => 'super_admin']);
        Company::factory()->create(['company_code' => $user->company_code]);
        [$bundleId, $nosId] = $this->createUnits($user->company_code);

        $section = Section::factory()->create(['company_code' => $user->company_code]);
        $product = Product::factory()->create([
            'company_code' => $user->company_code,
            'section_code' => $section->section_code,
            'transfer_unit_id' => $bundleId,
            'receiving_unit_id' => $nosId,
            'transfer_conversion_factor' => 10,
        ]);

        // seed couple of stock records
        $this->makeStock($product, $section, 20);
        $this->makeStock($product, $section, 5);

        $response = $this->actingAs($user)->getJson(route('stock-transfers.get-product-stock', [
            'item_id' => $product->ItmKy,
            'section_code' => $section->section_code,
        ]));

        $response->assertOk();
        $body = $response->json();

        // no conversion history so bundle/nos fields should not be present
        $this->assertArrayNotHasKey('bundle_stock', $body);
        $this->assertArrayNotHasKey('nos_stock', $body);
        $this->assertEquals(25.0, $body['stock']);

        // batches total should also sum to 25
        $sumBatches = array_sum(array_column($body['batches'], 'quantity'));
        $this->assertEquals(25.0, $sumBatches);
    }

    public function test_get_product_stock_credits_only_bundle_quantity_after_conversion()
    {
        $user = User::factory()->create(['user_type' => 'super_admin']);
        Company::factory()->create(['company_code' => $user->company_code]);
        [$bundleId, $nosId] = $this->createUnits($user->company_code);

        $section = Section::factory()->create(['company_code' => $user->company_code]);
        $product = Product::factory()->create([
            'company_code' => $user->company_code,
            'section_code' => $section->section_code,
            'transfer_unit_id' => $bundleId,
            'receiving_unit_id' => $nosId,
            'transfer_conversion_factor' => 10,
        ]);

        // initial stock = 10 bundles
        $this->makeStock($product, $section, 10);

        // perform a forward conversion (1 bundle -> 10 nos)
        $this->actingAs($user)->post(route('stock-conversions.store'), [
            'section_code' => $section->section_code,
            'item_id' => $product->ItmKy,
            'input_quantity' => 1,
            'conversion_date' => now()->toDateString(),
            'reverse' => false,
        ])->assertRedirect(route('stock-conversions.index'));

        // now query stock for transfer
        $response = $this->actingAs($user)->getJson(route('stock-transfers.get-product-stock', [
            'item_id' => $product->ItmKy,
            'section_code' => $section->section_code,
        ]));

        $response->assertOk();
        $body = $response->json();

        // bundle stock should have been reduced to 9, nos_stock 10
        $this->assertEquals(9.0, $body['stock']);
        $this->assertEquals(9.0, $body['bundle_stock']);
        $this->assertEquals(10.0, $body['nos_stock']);

        // batches should include the bundle/nos fields
        foreach ($body['batches'] as $batch) {
            $this->assertArrayHasKey('bundle_stock', $batch);
            $this->assertArrayHasKey('nos_stock', $batch);
        }
    }

    public function test_store_prevents_transfer_exceeding_bundle_stock_after_conversion()
    {
        $user = User::factory()->create(['user_type' => 'super_admin']);
        Company::factory()->create(['company_code' => $user->company_code]);
        [$bundleId, $nosId] = $this->createUnits($user->company_code);

        $section = Section::factory()->create(['company_code' => $user->company_code]);
        $product = Product::factory()->create([
            'company_code' => $user->company_code,
            'section_code' => $section->section_code,
            'transfer_unit_id' => $bundleId,
            'receiving_unit_id' => $nosId,
            'transfer_conversion_factor' => 10,
        ]);

        // initial stock = 10 bundles
        $this->makeStock($product, $section, 10);

        // convert 1 bundle to 10 nos
        $this->actingAs($user)->post(route('stock-conversions.store'), [
            'section_code' => $section->section_code,
            'item_id' => $product->ItmKy,
            'input_quantity' => 1,
            'conversion_date' => now()->toDateString(),
            'reverse' => false,
        ])->assertRedirect(route('stock-conversions.index'));

        // attempt transfer of 10 units (should fail because only 9 bundles available)
        $transferData = [
            'from_section_code' => $section->section_code,
            'to_section_code' => 'DEST',
            'items' => [
                ['item_id' => $product->ItmKy, 'quantity' => 10],
            ],
            'transfer_date' => now()->toDateString(),
        ];
        // create dummy destination section so validation by exists passes
        Section::factory()->create(['section_code' => 'DEST', 'company_code' => $user->company_code]);

        $response = $this->actingAs($user)->post('/stock-transfers', $transferData);

        $response->assertSessionHasErrors('items.0.quantity');
        $this->assertStringContainsString('Insufficient', session('errors')->first('items.0.quantity'));

        // now transfer within limits
        $transferData['items'][0]['quantity'] = 9;
        $this->actingAs($user)->post('/stock-transfers', $transferData)
            ->assertSessionDoesntHaveErrors();
    }
}
