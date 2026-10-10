<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\User;
use App\Models\Section;
use App\Models\Product;
use App\Models\Wastage;
use App\Models\StockInHand;

class WastageStockSectionTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * When an approved wastage record is updated and its section changes the
     * stock ledger should restore the quantity to the original section and
     * deduct it from the new section.  This mimics the behaviour of a stock
     * transfer so that stock‑transfer UI/data and bin‑cards remain accurate.
     */
    public function test_updating_section_on_approved_wastage_restores_and_deducts()
    {
        // create user and company context
        $user = User::factory()->create(['user_type' => 'super_admin', 'company_code' => 'C1']);

        // two sections belonging to same company
        $sectionA = Section::factory()->create([ 'company_code' => 'C1', 'section_code' => 'SEC-A' ]);
        $sectionB = Section::factory()->create([ 'company_code' => 'C1', 'section_code' => 'SEC-B' ]);

        // product lives initially in section A
        $product = Product::factory()->create([
            'company_code' => 'C1',
            'section_code' => $sectionA->section_code,
        ]);

        // give some positive stock so the deduction does not produce a negative
        StockInHand::factory()->create([
            'company_code' => 'C1',
            'section_code' => $sectionA->section_code,
            'ItemKy' => $product->ItmKy,
            'Qty' => 10,
            'TrnTyp' => 'PUR',
        ]);

        // create wastage via controller (approved)
        $this->actingAs($user)
             ->post('/wastages', [
                 'product_id' => $product->ItmKy,
                 'quantity' => 2,
                 'reason' => 'Test wastage',
                 'wastage_date' => now()->format('Y-m-d'),
                 'notes' => '',
                 'status' => 'approved',
                 'section_id' => $sectionA->id,
             ])->assertRedirect(route('wastages.index'));

        $wastage = Wastage::latest()->first();
        $this->assertNotNull($wastage, 'Wastage record created');

        // verify stock entry created under section A
        $this->assertDatabaseHas('stock_in_hand', [
            'ItemKy' => $product->ItmKy,
            'section_code' => $sectionA->section_code,
            'TrnTyp' => 'WASTAGE',
            'Qty' => -2,
        ]);

        // now update the wastage: keep approved but move to section B
        $this->actingAs($user)
             ->put("/wastages/{$wastage->id}", [
                 'product_id' => $product->ItmKy,
                 'quantity' => 2,
                 'reason' => 'Test wastage',
                 'wastage_date' => now()->format('Y-m-d'),
                 'notes' => '',
                 'status' => 'approved',
                 'serial_number' => null,
                 'batch_no' => null,
                 'warranty' => null,
                 'section_id' => $sectionB->id,
             ])->assertRedirect(route('wastages.index'));

        // after update we expect a restoration entry in section A and a new
        // deduction in section B
        $this->assertDatabaseHas('stock_in_hand', [
            'ItemKy' => $product->ItmKy,
            'section_code' => $sectionA->section_code,
            'TrnTyp' => 'WST_RESTO',
            'Qty' => 2,
        ]);

        $this->assertDatabaseHas('stock_in_hand', [
            'ItemKy' => $product->ItmKy,
            'section_code' => $sectionB->section_code,
            'TrnTyp' => 'WASTAGE',
            'Qty' => -2,
        ]);
    }
}
