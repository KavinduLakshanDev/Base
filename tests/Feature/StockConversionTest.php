<?php

namespace Tests\Feature;

use App\Models\CodeMaster;
use App\Models\Company;
use App\Models\Product;
use App\Models\Section;
use App\Models\StockConversion;
use App\Models\StockInHand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StockConversionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // RefreshDatabase will handle migrations automatically
    }

    private function createUnits(string $companyCode): array
    {
        // The code_masters table has a foreign key to control_masters.conkey,
        // so ensure a control master record exists before inserting units.
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

        // create two units in code_masters; minimal required fields are present
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
            'TrnTyp'       => 'ADJ',
        ]);
    }

    public function test_forward_conversion_creates_records_and_adjusts_stock()
    {
        $user = User::factory()->create(['user_type' => 'super_admin']);
        // create company record so section FK succeeds
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

        $this->makeStock($product, $section, 50);

        $response = $this->actingAs($user)->post(route('stock-conversions.store'), [
            'section_code' => $section->section_code,
            'item_id' => $product->ItmKy,
            'input_quantity' => 5,
            'conversion_date' => now()->toDateString(),
            'reverse' => false,
        ]);

        $response->assertRedirect(route('stock-conversions.index'));

        $this->assertDatabaseHas('stock_conversions', [
            'item_id' => $product->ItmKy,
            'input_quantity' => 5,
            'output_quantity' => 50,
            'reverse' => false,
            'from_unit_id' => $bundleId,
            'to_unit_id' => $nosId,
        ]);

        // two additional stock_in_hand rows should exist (one -5, one +50)
        $this->assertDatabaseHas('stock_in_hand', [
            'ItemKy' => $product->ItmKy,
            'section_code' => $section->section_code,
            'Qty' => -5,
        ]);
        $this->assertDatabaseHas('stock_in_hand', [
            'ItemKy' => $product->ItmKy,
            'section_code' => $section->section_code,
            'Qty' => 50,
        ]);
    }

    public function test_create_page_respects_initial_query_params()
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

        $response = $this->actingAs($user)->get(
            '/stock-conversions/create?item_id='.$product->ItmKy.
            '&section_code='.$section->section_code.
            '&input_quantity=12&reverse=1'
        );

        $response->assertInertia(fn ($page) =>
            $page->component('StockConversion/Create')
                ->where('initial.item_id', (string) $product->ItmKy)
                ->where('initial.section_code', $section->section_code)
                ->where('initial.input_quantity', '12')
                // the query parameter comes through as a string
                ->where('initial.reverse', '1')
        );
    }

    public function test_reverse_conversion_uses_inverse_factor_and_swaps_units()
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

        // seed some nos stock so we can convert back
        $this->makeStock($product, $section, 120);

        // perform reverse conversion: convert 37 nos back into bundles
        $response = $this->actingAs($user)->post(route('stock-conversions.store'), [
            'section_code' => $section->section_code,
            'item_id' => $product->ItmKy,
            'input_quantity' => 37,
            'conversion_date' => now()->toDateString(),
            'reverse' => true,
        ]);
        $response->assertRedirect(route('stock-conversions.index'));

        $this->assertDatabaseHas('stock_conversions', [
            'item_id' => $product->ItmKy,
            'input_quantity' => 37,
            'output_quantity' => round(37/10,4),
            'reverse' => true,
            'from_unit_id' => $nosId,
            'to_unit_id' => $bundleId,
        ]);
    }

    public function test_non_integer_factor_is_handled_correctly()
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
            'transfer_conversion_factor' => 2.5,
        ]);

        $this->makeStock($product, $section, 100);

        // forward conversion: 4 bundles → 10 nos
        $response = $this->actingAs($user)->post(route('stock-conversions.store'), [
            'section_code' => $section->section_code,
            'item_id' => $product->ItmKy,
            'input_quantity' => 4,
            'conversion_date' => now()->toDateString(),
            'reverse' => false,
        ]);
        $response->assertRedirect(route('stock-conversions.index'));

        $this->assertDatabaseHas('stock_conversions', [
            'item_id' => $product->ItmKy,
            'input_quantity' => 4,
            'output_quantity' => 10.0,
            'reverse' => false,
        ]);

        // reverse conversion: 10 nos → 4 bundles
        $this->makeStock($product, $section, 50);
        $response = $this->actingAs($user)->post(route('stock-conversions.store'), [
            'section_code' => $section->section_code,
            'item_id' => $product->ItmKy,
            'input_quantity' => 10,
            'conversion_date' => now()->toDateString(),
            'reverse' => true,
        ]);
        $response->assertRedirect(route('stock-conversions.index'));
        $this->assertDatabaseHas('stock_conversions', [
            'item_id' => $product->ItmKy,
            'input_quantity' => 10,
            'output_quantity' => round(10/2.5, 4),
            'reverse' => true,
        ]);
    }
}
