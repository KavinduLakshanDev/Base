<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\User;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseDet;

class PurchaseEditTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * A simple sanity check to ensure the edit page returns the product code
     * for a main-stock purchase item.  This used to come back as an empty
     * string/dash in the UI, which prompted the recent debugging work.
     */
    /** Helper: create a purchase + single detail row */
    private function makePurchase(string $companyCode, array $productAttrs, array $detailAttrs): array
    {
        static $seq = 500;
        $seq++;

        $product = Product::factory()->create(array_merge([
            'company_code' => $companyCode,
            'section_code' => 'S1',
        ], $productAttrs));

        $purchase = Purchase::create([
            'company_code' => $companyCode,
            'section_code' => 'S1',
            'PurchaseKey' => $seq,
            'PurchaseNo'  => $seq,
            'GRNDate'     => now(),
            'CostTotal'   => 0,
            'TotalVal'    => 0,
            'ToIDscount'  => 0,
            'Status'      => 'A',
            'flnact'      => false,
            'flused'      => false,
            'type'        => 'supplier',
        ]);

        PurchaseDet::create(array_merge([
            'company_code'   => $companyCode,
            'section_code'   => 'S1',
            'PerchaseDetKy'  => $seq * 10,
            'PurchaseKey'    => $purchase->PurchaseKey,
            'iTimKy'         => $product->ItmKy,
            'Qty'            => 5,
            'CostPrice'      => 100,
            'DiscountRate'   => 0,
            'Free'           => 0,
            'AmountF'        => 500,
        ], $detailAttrs));

        return [$product, $purchase];
    }

    /** main-stock item with an ItemCode should surface that code */
    public function test_main_stock_purchase_shows_product_code_in_edit_props()
    {
        $user = User::factory()->create(['user_type' => 'super_admin', 'company_code' => 'C1']);
        [, $purchase] = $this->makePurchase('C1',
            ['ItemCode' => 'P001', 'ItmNm' => 'Test Product'],
            ['stock_location_type' => 'main_stock']
        );

        $this->actingAs($user)
            ->get("/pos/purchases/{$purchase->PurchaseKey}/edit")
            ->assertStatus(200)
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) =>
                $page->component('pos/purchases/edit')
                    ->has('purchase.items', 1)
                    ->where('purchase.items.0.product_code', 'P001')
            );
    }

    /** printing-section item with ItemCode should ALSO surface that code (not serial_number) */
    public function test_printing_section_purchase_shows_product_code_in_edit_props()
    {
        $user = User::factory()->create(['user_type' => 'super_admin', 'company_code' => 'C1']);
        [, $purchase] = $this->makePurchase('C1',
            ['ItemCode' => '888888', 'ItmNm' => 'Kandos Choc'],
            ['stock_location_type' => 'printing_section', 'serial_number' => null]
        );

        $this->actingAs($user)
            ->get("/pos/purchases/{$purchase->PurchaseKey}/edit")
            ->assertStatus(200)
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) =>
                $page->component('pos/purchases/edit')
                    ->has('purchase.items', 1)
                    ->where('purchase.items.0.product_code', '888888')  // must NOT be empty
            );
    }

    /** item where ItemCode is empty string should fall back to detail.barcode */
    public function test_product_code_falls_back_to_barcode_when_itemcode_empty()
    {
        $user = User::factory()->create(['user_type' => 'super_admin', 'company_code' => 'C1']);
        [, $purchase] = $this->makePurchase('C1',
            ['ItemCode' => '', 'ItmNm' => 'Barcode Only Item'],
            ['stock_location_type' => 'main_stock', 'barcode' => 'BAR9999']
        );

        $this->actingAs($user)
            ->get("/pos/purchases/{$purchase->PurchaseKey}/edit")
            ->assertStatus(200)
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) =>
                $page->component('pos/purchases/edit')
                    ->has('purchase.items', 1)
                    ->where('purchase.items.0.product_code', 'BAR9999')
            );
    }

    /** show() and edit() must return the same product_code value */
    public function test_show_and_edit_return_same_product_code()
    {
        $user = User::factory()->create(['user_type' => 'super_admin', 'company_code' => 'C1']);
        [, $purchase] = $this->makePurchase('C1',
            ['ItemCode' => 'SYNC01', 'ItmNm' => 'Sync Test Product'],
            ['stock_location_type' => 'main_stock']
        );

        $editCode = null;
        $this->actingAs($user)
            ->get("/pos/purchases/{$purchase->PurchaseKey}/edit")
            ->assertInertia(function (\Inertia\Testing\AssertableInertia $page) use (&$editCode) {
                $page->component('pos/purchases/edit')
                    ->has('purchase.items', 1);
                $editCode = $page->toArray()['props']['purchase']['items'][0]['product_code'];
            });

        $this->actingAs($user)
            ->get("/pos/purchases/{$purchase->PurchaseKey}")
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) =>
                $page->component('pos/purchases/show')
                    ->where('purchase.items.0.product_code', $editCode)
            );
    }
}
