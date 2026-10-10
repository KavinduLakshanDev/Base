<?php

namespace Tests\Feature;

use App\Models\PurchaseDet;
use App\Models\StockInHand;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PrintingSectionProductsTest extends TestCase
{
    use DatabaseTransactions;

    /** @test */
    public function availability_filter_returns_only_matching_serials()
    {
        $user = User::factory()->create();
        // ensure section_code exists for stock queries
        $user->section_code = $user->section_code ?: 'MAIN';
        $user->company_code = $user->company_code ?: 'VIS001';
        $user->save();

        $this->actingAs($user);

        // create two printer GRN entries
        $pd1 = PurchaseDet::factory()->create([
            'company_code' => $user->company_code,
            'serial_number' => 'SN1',
            'brand' => 'TestBrand',
            'model' => 'X100',
            'Qty' => 1,
            'stock_location_type' => 'main_stock',
        ]);
        $pd2 = PurchaseDet::factory()->create([
            'company_code' => $user->company_code,
            'serial_number' => 'SN2',
            'brand' => 'TestBrand',
            'model' => 'X200',
            'Qty' => 1,
            'stock_location_type' => 'main_stock',
        ]);

        // stock only for SN1
        StockInHand::create([
            'serial_number' => 'SN1',
            'section_code' => $user->section_code,
            'Qty' => 1,
        ]);

        // ask for available
        $resp = $this->get(route('printing-section-products', ['availability' => 'available']));
        $resp->assertStatus(200);
        $resp->assertInertia(fn($page) =>
            $page->component('pos/printing-section-products/index')
                ->where('products.data.0.serial_number', 'SN1')
        );

        // ask for sold
        $resp2 = $this->get(route('printing-section-products', ['availability' => 'sold']));
        $resp2->assertStatus(200);
        $resp2->assertInertia(fn($page) =>
            $page->component('pos/printing-section-products/index')
                ->where('products.data.0.serial_number', 'SN2')
        );
    }
}
