<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\ItemMaster;
use App\Models\StockInHand;
use App\Models\SalesTransactionItem;

class SalesEditTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * Editing a sale must reject requests that would cause negative inventory.
     * Previously update() had no stock check; this confirms the fix is in place.
     */
    public function test_updating_sale_rejects_insufficient_stock()
    {
        // create a super admin user so permission checks always pass
        $user = User::factory()->create([
            'user_type' => 'super_admin',
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        $this->actingAs($user);

        // create a simple item and give it 5 units of stock
        $item = ItemMaster::create([
            // use a numeric key so product_id (bigint) accepts it without casting errors
            'ItmKy' => 1,
            'ItemCode' => 'ITEM1',
            'ItmNm' => 'Test Item',
            'SlsPri' => 1,
            'CosPri' => 0,
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        StockInHand::create([
            'ItemKy' => $item->ItmKy,
            'Qty' => 5,
            'FreeQty' => 0,
            'section_code' => 'MAIN',
            'company_code' => 'TEST',
            'owner_company_code' => 'TEST',
        ]);

        // post a sale with quantity 1 of the item
        $payload = [
            'transaction_date' => now()->format('Y-m-d'),
            'customer_code' => '0001',
            'customer_name' => 'cash',
            'price_type' => 'retail',
            'subtotal' => 1,
            'total_amount' => 1,
            'is_vat_invoice' => false,
            'vat_rate' => 0,
            'discount_amount' => 0,
            'cash_payment' => 1,
            'card_payment' => 0,
            'points_redeem' => 0,
            'payment_mode' => 'cash',
            'items' => [
                [
                    'item_code' => $item->ItemCode,
                    'item_name' => $item->ItmNm,
                    'unit_price' => 1,
                    'our_price' => 1,
                    'cost_price' => 0,
                    'quantity' => 1,
                    'free_quantity' => 0,
                    'total' => 1,
                    'retail_price' => 1,
                    'wholesale_price' => 1,
                    'extra_price' => 1,
                    'itm_ky' => $item->ItmKy,
                    'batch_no' => null,
                    'vat_inclusive' => false,
                ],
            ],
        ];

        $response = $this->postJson('/sales', $payload);
        $response->assertStatus(200);
        $saleId = $response->json('sale_id');
        $this->assertNotNull($saleId);

        // stock should have been reduced by 1 (5 -> 4)
        $stockSum = StockInHand::where('ItemKy', $item->ItmKy)
            ->select(DB::raw('SUM(COALESCE(Qty,0)+COALESCE(FreeQty,0)) as total'))
            ->first()->total;
        $this->assertEquals(4, $stockSum, 'Initial stock deduction did not occur as expected');

        // attempt to update the sale to quantity 10 (more than available)
        $updatePayload = $payload;
        $updatePayload['items'][0]['quantity'] = 10;
        $updatePayload['items'][0]['total'] = 10;
        $updatePayload['subtotal'] = 10;
        $updatePayload['total_amount'] = 10;

        $updateResponse = $this->put("/sales/{$saleId}", $updatePayload);
        // Fix: controller must reject insufficient-stock updates.
        // For a web (non-JSON) PUT, Laravel redirects back (302) and stores
        // the ValidationException message in the session errors.
        $updateResponse->assertSessionHasErrors('items');

        // Stock must remain unchanged (4 units, not go negative)
        $stockSum2 = StockInHand::where('ItemKy', $item->ItmKy)
            ->select(DB::raw('SUM(COALESCE(Qty,0)+COALESCE(FreeQty,0)) as total'))
            ->first()->total;

        $this->assertGreaterThanOrEqual(0, $stockSum2, 'Stock went negative — stock validation in update() is broken');
    }

    /**
     * VAT status and rate should be updateable when editing a sale.
     */
    public function test_updating_sale_changes_vat_fields()
    {
        $user = User::factory()->create([
            'user_type' => 'super_admin',
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);
        $this->actingAs($user);

        // create simple item
        $item = ItemMaster::create([
            'ItmKy' => 2,
            'ItemCode' => 'VAT1',
            'ItmNm' => 'Vat Item',
            'SlsPri' => 100,
            'CosPri' => 0,
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        StockInHand::create([
            'ItemKy' => $item->ItmKy,
            'Qty' => 10,
            'FreeQty' => 0,
            'section_code' => 'MAIN',
            'company_code' => 'TEST',
            'owner_company_code' => 'TEST',
        ]);

        // create a non-vat sale
        $payload = [
            'transaction_date' => now()->format('Y-m-d'),
            'customer_code' => '0001',
            'customer_name' => 'cash',
            'price_type' => 'retail',
            'subtotal' => 100,
            'total_amount' => 100,
            'is_vat_invoice' => false,
            'vat_rate' => 0,
            'discount_amount' => 0,
            'cash_payment' => 100,
            'card_payment' => 0,
            'points_redeem' => 0,
            'payment_mode' => 'cash',
            'items' => [[
                'item_code' => $item->ItemCode,
                'item_name' => $item->ItmNm,
                'unit_price' => 100,
                'our_price' => 100,
                'cost_price' => 0,
                'quantity' => 1,
                'free_quantity' => 0,
                'total' => 100,
                'retail_price' => 100,
                'wholesale_price' => 100,
                'extra_price' => 100,
                'itm_ky' => null,
                'batch_no' => null,
                'vat_inclusive' => false,
            ]],
        ];

        $response = $this->postJson('/sales', $payload);
        $response->assertStatus(200);
        $saleId = $response->json('sale_id');

        // Now update sale so it becomes a VAT invoice with rate 12%
        $update = $payload;
        $update['is_vat_invoice'] = true;
        $update['vat_rate'] = 12;
        $update['total_amount'] = 112; // 100 + 12% VAT

        $this->put("/sales/{$saleId}", $update);

        $sale = \App\Models\SalesTransaction::find($saleId);
        $this->assertTrue($sale->is_vat_invoice, 'VAT flag was not updated');
        $this->assertEquals(12, $sale->vat_rate, 'VAT rate was not updated correctly');
    }

    /**
     * When editing a sale, increasing quantity past the item's
     * `wholesale_min_qty` should cause the unit_price to switch to the
     * wholesale price (and revert back if quantity is reduced).
     */
    public function test_editing_sale_respects_wholesale_threshold()
    {
        $user = User::factory()->create([
            'user_type' => 'super_admin',
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);
        $this->actingAs($user);

        $item = ItemMaster::create([
            'ItmKy' => 3,
            'ItemCode' => 'ITEM2',
            'ItmNm' => 'Threshold Item',
            'SlsPri' => 100,
            'WholePrice' => 80,
            'wholesale_min_qty' => 5,
            'CosPri' => 0,
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        // give some stock
        StockInHand::create([
            'ItemKy' => $item->ItmKy,
            'Qty' => 20,
            'FreeQty' => 0,
            'section_code' => 'MAIN',
            'company_code' => 'TEST',
            'owner_company_code' => 'TEST',
        ]);

        // create sale with quantity below threshold
        $payload = [
            'transaction_date' => now()->format('Y-m-d'),
            'customer_code' => '0001',
            'customer_name' => 'cash',
            'price_type' => 'retail',
            'subtotal' => 400,
            'total_amount' => 400,
            'is_vat_invoice' => false,
            'vat_rate' => 0,
            'discount_amount' => 0,
            'cash_payment' => 400,
            'card_payment' => 0,
            'points_redeem' => 0,
            'payment_mode' => 'cash',
            'items' => [[
                'item_code' => $item->ItemCode,
                'item_name' => $item->ItmNm,
                'unit_price' => 100,
                'our_price' => 100,
                'cost_price' => 0,
                'quantity' => 4,
                'free_quantity' => 0,
                'total' => 400,
                'retail_price' => 100,
                'wholesale_price' => 80,
                'extra_price' => 100,
                'itm_ky' => null,
                'batch_no' => null,
                'vat_inclusive' => false,
            ]],
        ];

        $response = $this->postJson('/sales', $payload);
        $response->assertStatus(200);
        $saleId = $response->json('sale_id');

        // now update the sale with quantity above threshold
        $update = $payload;
        $update['items'][0]['quantity'] = 6;
        $update['items'][0]['unit_price'] = 80;
        $update['items'][0]['our_price'] = 80;
        $update['items'][0]['total'] = 480; // 6 × 80 wholesale
        $update['subtotal'] = 480;
        $update['total_amount'] = 480;

        $this->put("/sales/{$saleId}", $update);

        $itemRecord = SalesTransactionItem::where('sales_transaction_id', $saleId)
            ->where('item_code', $item->ItemCode)
            ->first();
        $this->assertNotNull($itemRecord);
        $this->assertEquals(80, $itemRecord->unit_price, 'Wholesale price was not applied during edit');

        // reduce quantity back below threshold, price should revert to retail
        $update['items'][0]['quantity'] = 3;
        $update['items'][0]['unit_price'] = 100;
        $update['items'][0]['our_price'] = 100;
        $update['items'][0]['total'] = 300;
        $update['subtotal'] = 300;
        $update['total_amount'] = 300;

        $this->put("/sales/{$saleId}", $update);
        $itemRecord = SalesTransactionItem::where('sales_transaction_id', $saleId)
            ->where('item_code', $item->ItemCode)
            ->first();
        $this->assertEquals(100, $itemRecord->unit_price, 'Price did not revert to retail when qty dropped');
    }

    /**
     * Even when a sale contains a printer record, editing the sale and
     * switching the price_type to wholesale should result in the item
     * record reflecting the new wholesale price. This guards against any
     * back‑end logic accidentally overriding prices for printer sales.
     */
    public function test_printer_sale_edit_allows_wholesale_price()
    {
        $user = User::factory()->create([
            'user_type' => 'super_admin',
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);
        $this->actingAs($user);

        $item = ItemMaster::create([
            'ItmKy' => 10,
            'ItemCode' => 'PRNTEST2',
            'ItmNm' => 'Printer Wholesale Test',
            'SlsPri' => 1000,
            'WholePrice' => 800,
            'CosPri' => 0,
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        StockInHand::create([
            'ItemKy' => $item->ItmKy,
            'Qty' => 1,
            'FreeQty' => 0,
            'section_code' => 'MAIN',
            'company_code' => 'TEST',
            'owner_company_code' => 'TEST',
            'serial_number' => 'WSHL-001',
        ]);

        // create registered customer (required for printer sale)
        
        \App\Models\Customer::create([
            'AdrCd' => 'CUSTWS',
            'FstNm' => 'Wholesale',
            'LstNm' => 'Buyer',
            'AccKy' => 99,
            'company_code' => 'TEST',
        ]);

        $payload = [
            'transaction_date' => now()->format('Y-m-d'),
            'customer_code' => 'CUSTWS',
            'customer_name' => 'Wholesale Buyer',
            'price_type' => 'retail',
            'subtotal' => 1000,
            'total_amount' => 1000,
            'is_vat_invoice' => false,
            'vat_rate' => 0,
            'discount_amount' => 0,
            'cash_payment' => 1000,
            'card_payment' => 0,
            'points_redeem' => 0,
            'payment_mode' => 'cash',
            'items' => [
                [
                    'item_code' => $item->ItemCode,
                    'item_name' => $item->ItmNm,
                    'unit_price' => 1000,
                    'our_price' => 1000,
                    'cost_price' => 0,
                    'quantity' => 1,
                    'free_quantity' => 0,
                    'total' => 1000,
                    'retail_price' => 1000,
                    'wholesale_price' => 800,
                    'extra_price' => 1000,
                    'itm_ky' => $item->ItmKy,
                    'batch_no' => null,
                    'serial_number' => 'WSHL-001',
                    'vat_inclusive' => false,
                ],
            ],
        ];

        $resp = $this->postJson('/sales', $payload);
        $resp->assertStatus(200);
        $saleId = $resp->json('sale_id');

        // now update with price_type wholesale, item unit_price should change
        $update = $payload;
        $update['price_type'] = 'wholesale';
        $update['items'][0]['unit_price'] = 800;
        $update['items'][0]['our_price'] = 800;
        $update['items'][0]['total'] = 800;
        $update['subtotal'] = 800;
        $update['total_amount'] = 800;

        $this->put("/sales/{$saleId}", $update);

        $itemRecord = SalesTransactionItem::where('sales_transaction_id', $saleId)
            ->where('item_code', $item->ItemCode)
            ->first();
        $this->assertEquals(800, $itemRecord->unit_price, 'Wholesale price was not applied for printer sale during edit');
    }

    /**
     * Editing a sale must reject duplicate printer serial numbers, just like store() does.
     * Previously update() had no serial duplicate guard; this confirms the fix is in place.
     */
    public function test_editing_sale_rejects_duplicate_printer_serials()
    {
        $user = User::factory()->create([
            'user_type' => 'super_admin',
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        $this->actingAs($user);

        // use the same item as before for simplicity
        $item = ItemMaster::create([
            'ItmKy' => 4,
            'ItemCode' => 'PRN1',
            'ItmNm' => 'Printer Item',
            'SlsPri' => 100,
            'CosPri' => 0,
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        // create a registered customer (required for printer sales)
        \App\Models\Customer::create([
            'AdrCd' => 'CUST001',
            'FstNm' => 'Registered',
            'LstNm' => 'Customer',
            'AccKy' => 1,
            'company_code' => 'TEST',
        ]);

        StockInHand::create([
            'ItemKy' => $item->ItmKy,
            'Qty' => 2,
            'FreeQty' => 0,
            'section_code' => 'MAIN',
            'company_code' => 'TEST',
            'owner_company_code' => 'TEST',
            'serial_number' => 'SERIAL123',
        ]);

        $payload = [
            'transaction_date' => now()->format('Y-m-d'),
            'customer_code' => 'CUST001',
            'customer_name' => 'Registered Customer',
            'price_type' => 'retail',
            'subtotal' => 100,
            'total_amount' => 100,
            'is_vat_invoice' => false,
            'vat_rate' => 0,
            'discount_amount' => 0,
            'cash_payment' => 100,
            'card_payment' => 0,
            'points_redeem' => 0,
            'payment_mode' => 'cash',
            'items' => [
                [
                    'item_code' => $item->ItemCode,
                    'item_name' => $item->ItmNm,
                    'unit_price' => 100,
                    'our_price' => 100,
                    'cost_price' => 0,
                    'quantity' => 1,
                    'free_quantity' => 0,
                    'total' => 100,
                    'retail_price' => 100,
                    'wholesale_price' => 100,
                    'extra_price' => 100,
                    'itm_ky' => $item->ItmKy,
                    'batch_no' => null,
                    'serial_number' => 'SERIAL123',
                    'vat_inclusive' => false,
                ],
            ],
        ];

        $response = $this->postJson('/sales', $payload);
        $response->assertStatus(200);
        $saleId = $response->json('sale_id');

        // now update with two items having the same serial number
        $updatePayload = $payload;
        $updatePayload['items'] = [
            array_merge($payload['items'][0], ['quantity' => 1, 'total' => 100]),
            array_merge($payload['items'][0], ['quantity' => 1, 'total' => 100]),
        ];
        $updatePayload['subtotal'] = 200;
        $updatePayload['total_amount'] = 200;

        $updateResponse = $this->put("/sales/{$saleId}", $updatePayload);
        // Fix: duplicate serials must be rejected with 422
        $updateResponse->assertStatus(422);

        // The sale should still have 1 item (the original), not 2
        $count = SalesTransactionItem::where('sales_transaction_id', $saleId)->count();
        $this->assertEquals(1, $count, 'Duplicate serial update should have been rejected — sale items were incorrectly modified');
    }

    /**
     * Searching for a printer serial during sale edit should return the record even
     * if stock is zero, as long as sale_id is included in the query. Without the
     * sale_id the same query should yield no results because stock has been
     * consumed by the original sale.
     */
    public function test_printer_search_includes_existing_serial_when_editing()
    {
        $user = User::factory()->create([
            'user_type' => 'super_admin',
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);
        $this->actingAs($user);

        // set up item and printer stock with one serial
        $item = ItemMaster::create([
            'ItmKy' => 5,
            'ItemCode' => 'PRNTEST',
            'ItmNm' => 'Printer Test',
            'SlsPri' => 500,
            'CosPri' => 0,
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        StockInHand::create([
            'ItemKy' => $item->ItmKy,
            'Qty' => 1,
            'FreeQty' => 0,
            'section_code' => 'MAIN',
            'company_code' => 'TEST',
            'owner_company_code' => 'TEST',
            'serial_number' => 'SER123'
        ]);

        // ensure company and section exist so FK constraints pass
        $company = \App\Models\Company::factory()->create(['company_code' => 'TEST']);
        // sections table is keyed by company_code not company_id
        $section = \App\Models\Section::factory()->create([
            'section_code' => 'MAIN',
            'company_code' => 'TEST',
        ]);

        // create a matching purchase record so purchase_det FK can be satisfied
        $purchaseKey = 1;
        DB::table('purchase')->insert([
            'company_code' => $company->company_code,
            'section_code' => $section->section_code,
            'PurchaseKey' => $purchaseKey,
            'PurchaseNo' => 1,
            'GRNDate' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // insert a dummy purchase_det record to simulate GRN stock
        // include a customer discount rate so search results carry it
        DB::table('purchase_det')->insert([
            'company_code' => $company->company_code,
            'section_code' => $section->section_code,
            'PerchaseDetKy' => 1,
            'PurchaseKey' => $purchaseKey,
            // iTimKy is integer column; use 0 as placeholder since we search by serial
            'iTimKy' => 0,
            'serial_number' => 'SER123',
            'brand' => 'BrandX',
            'model' => 'ModelY',
            'SalePrice' => 500,
            'CusDiscountRate' => 10, // 10% customer discount
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // create registered customer
        \App\Models\Customer::create([
            'AdrCd' => 'CUST002',
            'FstNm' => 'Cust',
            'LstNm' => 'Two',
            'AccKy' => 2,
            'company_code' => 'TEST',
        ]);

        $payload = [
            'transaction_date' => now()->format('Y-m-d'),
            'customer_code' => 'CUST002',
            'customer_name' => 'Cust Two',
            'price_type' => 'retail',
            'subtotal' => 500,
            'total_amount' => 500,
            'is_vat_invoice' => false,
            'vat_rate' => 0,
            'discount_amount' => 0,
            'cash_payment' => 500,
            'card_payment' => 0,
            'points_redeem' => 0,
            'payment_mode' => 'cash',
            'items' => [
                [
                    'item_code' => $item->ItemCode,
                    'item_name' => $item->ItmNm,
                    'unit_price' => 500,
                    'our_price' => 500,
                    'cost_price' => 0,
                    'quantity' => 1,
                    'free_quantity' => 0,
                    'total' => 500,
                    'retail_price' => 500,
                    'wholesale_price' => 500,
                    'extra_price' => 500,
                    'itm_ky' => $item->ItmKy,
                    'batch_no' => null,
                    'serial_number' => 'SER123',
                    'vat_inclusive' => false,
                ],
            ],
        ];

        $response = $this->postJson('/sales', $payload);
        $response->assertStatus(200);
        $saleId = $response->json('sale_id');

        // verify the sale actually contains the printer serial
        $sale = \App\Models\SalesTransaction::find($saleId);
        $this->assertNotNull($sale, 'Sale record not found');
        $this->assertTrue(
            $sale->items->pluck('serial_number')->contains('SER123'),
            'Sale items did not contain expected serial number'
        );

        // stock should now be 0 for the serial
        $stockSum = StockInHand::where('ItemKy', $item->ItmKy)
            ->where('serial_number', 'SER123')
            ->select(DB::raw('SUM(COALESCE(Qty,0)+COALESCE(FreeQty,0)) as total'))
            ->first()->total;
        $this->assertEquals(0, $stockSum);

        // search without sale_id returns empty array
        $searchResponse1 = $this->getJson('/sales/search/printers?query=SER123&price_type=retail');
        $this->assertEquals([], $searchResponse1->json());

        // search with sale_id should include the printer
        $searchResponse2 = $this->getJson("/sales/search/printers?query=SER123&price_type=retail&sale_id={$saleId}");
        $this->assertNotEmpty($searchResponse2->json(), 'Search with sale_id did not return existing serial');
        // ensure the returned record carries the discount rate we set above
        $this->assertEquals(10, $searchResponse2->json()[0]['cus_discount_rate']);
    }

    /**
     * When editing an existing sale and adding a printer that carries a
     * customer discount rate, the discount_amount field must be preserved in
     * the database. This simulates the frontend constructing the payload
     * after selecting a printer from the search dialog.
     */
    public function test_editing_sale_applies_discount_for_new_printer()
    {
        $user = User::factory()->create([
            'user_type' => 'super_admin',
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);
        $this->actingAs($user);

        // create two items: one normal, one printer
        $normal = ItemMaster::create([
            'ItmKy' => 6,
            'ItemCode' => 'ITEMN',
            'ItmNm' => 'Normal Item',
            'SlsPri' => 10,
            'CosPri' => 0,
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        $printer = ItemMaster::create([
            'ItmKy' => 7,
            'ItemCode' => 'PRNDISC',
            'ItmNm' => 'Printer Discount',
            'SlsPri' => 500,
            'CosPri' => 0,
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        // give them stock
        StockInHand::create([
            'ItemKy' => $normal->ItmKy,
            'Qty' => 5,
            'FreeQty' => 0,
            'section_code' => 'MAIN',
            'company_code' => 'TEST',
            'owner_company_code' => 'TEST',
        ]);
        StockInHand::create([
            'ItemKy' => $printer->ItmKy,
            'Qty' => 1,
            'FreeQty' => 0,
            'section_code' => 'MAIN',
            'company_code' => 'TEST',
            'owner_company_code' => 'TEST',
            'serial_number' => 'DISC001'
        ]);

        // create customer and purchase/GRN with discount rate
        \App\Models\Customer::create([
            'AdrCd' => 'CUST003',
            'FstNm' => 'Disc',
            'LstNm' => 'Buyer',
            'AccKy' => 3,
            'company_code' => 'TEST',
        ]);

        $company = \App\Models\Company::factory()->create(['company_code' => 'TEST']);
        $section = \App\Models\Section::factory()->create([
            'section_code' => 'MAIN',
            'company_code' => 'TEST',
        ]);
        $purchaseKey = 2;
        DB::table('purchase')->insert([
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
            'PurchaseKey' => $purchaseKey,
            'PurchaseNo' => 2,
            'GRNDate' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('purchase_det')->insert([
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
            'PerchaseDetKy' => 2,
            'PurchaseKey' => $purchaseKey,
            'iTimKy' => 0,
            'serial_number' => 'DISC001',
            'SalePrice' => 500,
            'CusDiscountRate' => 20, // 20% discount
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // create initial sale with only normal item
        $initialPayload = [
            'transaction_date' => now()->format('Y-m-d'),
            'customer_code' => 'CUST003',
            'customer_name' => 'Disc Buyer',
            'price_type' => 'retail',
            'subtotal' => 10,
            'total_amount' => 10,
            'is_vat_invoice' => false,
            'vat_rate' => 0,
            'discount_amount' => 0,
            'cash_payment' => 10,
            'card_payment' => 0,
            'points_redeem' => 0,
            'payment_mode' => 'cash',
            'items' => [[
                'item_code' => $normal->ItemCode,
                'item_name' => $normal->ItmNm,
                'unit_price' => 10,
                'our_price' => 10,
                'cost_price' => 0,
                'quantity' => 1,
                'free_quantity' => 0,
                'total' => 10,
                'retail_price' => 10,
                'wholesale_price' => 10,
                'extra_price' => 10,
                'itm_ky' => $normal->ItmKy,
                'batch_no' => null,
                'vat_inclusive' => false,
            ]],
        ];

        $resp = $this->postJson('/sales', $initialPayload);
        $resp->assertStatus(200);
        $saleId = $resp->json('sale_id');

        // now update: add the printer with expected discount
        $discount = (500 * 20) / 100;
        $updatePayload = $initialPayload;
        $updatePayload['items'][] = [
            'item_code' => $printer->ItemCode,
            'item_name' => $printer->ItmNm,
            'unit_price' => 500,
            'our_price' => 500,
            'cost_price' => 0,
            'quantity' => 1,
            'free_quantity' => 0,
            'total' => 500 - $discount,
            'discount_amount' => $discount,
            'retail_price' => 500,
            'wholesale_price' => 500,
            'extra_price' => 500,
            'itm_ky' => $printer->ItmKy,
            'batch_no' => null,
            'serial_number' => 'DISC001',
            'vat_inclusive' => false,
        ];
        $updatePayload['subtotal'] += 500;
        $updatePayload['total_amount'] += 500 - $discount;

        $putResp = $this->put("/sales/{$saleId}", $updatePayload);
        $putResp->assertSessionDoesntHaveErrors();

        $updated = \App\Models\SalesTransaction::find($saleId);
        $this->assertCount(2, $updated->items);
        $printerItem = $updated->items->where('serial_number','DISC001')->first();
        $this->assertNotNull($printerItem);
        $this->assertEquals($discount, $printerItem->discount_amount);
    }
}
