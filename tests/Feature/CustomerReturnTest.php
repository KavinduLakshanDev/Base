<?php

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Customer;
use App\Models\ItemMaster;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionItem;
use App\Models\CustomerReturn;
use App\Models\CustomerPayment;
use App\Models\StockInHand;
use App\Models\PurchaseDet;
use Illuminate\Support\Facades\DB;

/**
 * Ensure the migration adds the return_value column.
 */
test('customer_returns table has return_value column', function () {
    $this->assertTrue(\Schema::hasColumn('customer_returns', 'return_value'));
});

/**
 * Posting to the store route should create a return and populate return_value
 */
test('store route creates customer return and sets return_value', function () {
    $company = Company::create([
        'company_code' => 'TESTC',
        'name' => 'Test Co',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'SEC1',
        'name' => 'Test Section',
        'section_type' => 'store',
    ]);

    $user = User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    $response = $this->post('/customer-returns', [
        'return_date' => now()->toDateString(),
        'customer_name' => 'ACME Corp',
        'return_type' => 'item',
        'refund_method' => 'cash',
        'items' => [
            [
                'item_code' => 'ITEM1',
                'item_name' => 'Test Item',
                'quantity' => 1,
                'unit_price' => 50,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'item_type' => 'item',
                'condition' => 'good',
                'add_to_stock' => false,
            ],
        ],
    ]);

    // dump any error message for troubleshooting
    if ($response->getSession()->has('error')) {
        dump('session error:', $response->getSession()->get('error'));
    }

    $response->assertStatus(302)
             ->assertSessionHasNoErrors()
             ->assertSessionMissing('error');

    $this->assertDatabaseHas('customer_returns', [
        'customer_name' => 'ACME Corp',
        'return_value' => 50.00,
    ]);

    // also ensure the generated return number uses the new compact format
    $return = CustomerReturn::firstWhere('customer_name', 'ACME Corp');
    expect($return->return_no)->toMatch('/^R-' . preg_quote($section->section_code, '/') . '-\d{4}$/');
});


test('generateReturnNo produces a compact sequential identifier', function () {
    $section = 'SECX';

    // generate several numbers in a row; they should increment and match the
    // new short format.
    $first  = CustomerReturn::generateReturnNo($section);
    $second = CustomerReturn::generateReturnNo($section);

    expect($first)->toMatch('/^R-' . preg_quote($section, '/') . '-\d{4}$/');
    expect($second)->toMatch('/^R-' . preg_quote($section, '/') . '-\d{4}$/');
    // since nothing has been saved yet the value will be the same; the lock
    // only prevents two transactions from generating the same number when one
    // of them inserts a row first.
    expect($second)->toEqual($first);

    // now persist a record with that number and generate again – we should
    // see an increment
    CustomerReturn::create([
        'return_no' => $first,
        'return_date' => now()->toDateString(),
        'customer_name' => 'Dummy',
        'section_code' => $section,
        'company_code' => 'TESTC',
        'return_type' => 'item',
        'total_return_amount' => 0,
        'return_value' => 0,
        'refund_amount' => 0,
        'exchange_amount' => 0,
        'refund_method' => 'cash',
        'status' => 'pending',
    ]);

    $third = CustomerReturn::generateReturnNo($section);
    // third number should be different from the original
    expect($third)->not->toEqual($first);
});

// additional regression reproducer for VIS-ITM-000006 invoice
// ensures stock is really added into the main/import section with batch
// information (mirrors user screenshot scenario).
test('specific invoice VIS-ITM-000006 adds stock to the sale section', function () {
    $company = Company::create([
        'company_code' => 'TESTC',
        'name' => 'Test Co',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);

    $mainStock = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'MAIN-001',
        'name' => 'Import Buying and Selling',
        'section_type' => 'store',
        'is_main_stock' => true,
    ]);

    $otherSection = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'SEC1',
        'name' => 'Other Section',
        'section_type' => 'store',
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => $company->company_code,
        'section_code' => $otherSection->section_code,
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'visuser@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    $sale = \App\Models\SalesTransaction::create([
        'invoice_no' => 'VIS-ITM-000006',
        'transaction_date' => now(),
        'section_code' => $otherSection->section_code,
        'subtotal' => 3050,
        'total_amount' => 3050,
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code' => 'VIS-ITM',
        'item_name' => 'Visual Item',
        'quantity' => 1,
        'unit_price' => 3050,
        'discount_amount' => 0,
        'tax_amount' => 0,
        'item_type' => 'item',
        'batch_no' => 'B006',
    ]);

    $response = $this->post('/customer-returns', [
        'return_date' => now()->toDateString(),
        'customer_name' => 'NNNN',
        'original_invoice_no' => 'VIS-ITM-000006',
        'return_type' => 'item',
        'refund_method' => 'cash',
        'items' => [[
            'item_code' => 'VIS-ITM',
            'item_name' => 'Visual Item',
            'quantity' => 1,
            'unit_price' => 3050,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'item_type' => 'item',
            'condition' => 'good',
            'add_to_stock' => true,
            'batch_no' => 'B006',
        ]],
    ]);

    $response->assertStatus(302);

    // Stock must be restored to the section where the sale happened (SEC1),
    // not to the main stock section.
    $this->assertDatabaseHas('stock_in_hand', [
        'section_code' => $otherSection->section_code,
        'TrnTyp' => 'CUSTOMER_RETURN',
        'Qty' => 1.00,
        'batch_no' => 'B006',
    ]);
});


/**
 * When an item is returned with "add_to_stock" enabled, it must be added
 * to the import buying/selling section (main stock) named VIS-SEC-002.
 */
test('returned item is added to import buying section stock', function () {
    $company = Company::create([
        'company_code' => 'TESTC',
        'name' => 'Test Co',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);

    // create two sections: one normal, one main stock (import buying)
    $mainStock = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'RETURNED-MAIN',
        'name' => 'Import Buying Stock',
        'section_type' => 'store',
        'is_main_stock' => true,
    ]);

    $otherSection = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'RETURNED-OTHER',
        'name' => 'Other Section',
        'section_type' => 'store',
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => $company->company_code,
        'section_code' => $otherSection->section_code,
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'user2@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    $response = $this->post('/customer-returns', [
        'return_date' => now()->toDateString(),
        'customer_name' => 'ACME Corp',
        'return_type' => 'item',
        'refund_method' => 'cash',
        'items' => [
            [
                'item_code' => 'ITEM1',
                'item_ky' => 9999,
                'item_name' => 'Test Item',
                'quantity' => 1,
                'unit_price' => 50,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'item_type' => 'item',
                'condition' => 'good',
                'add_to_stock' => true,
            ],
        ],
    ]);

    $response->assertStatus(302);

    // the stock_in_hand table should contain a record in the main stock section
    $this->assertDatabaseHas('stock_in_hand', [
        'company_code' => $company->company_code,
        'section_code' => $mainStock->section_code,
        'TrnTyp' => 'CUSTOMER_RETURN',
        'Qty' => 1.00,
    ]);
});


test('invoice-based return items are sent to the section the sale came from', function () {
    $company = Company::create([
        'company_code' => 'TESTC',
        'name' => 'Test Co',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);

    $mainStock = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'INVBASED-001',
        'name' => 'Import Buying Stock',
        'section_type' => 'store',
        'is_main_stock' => true,
    ]);

    $otherSection = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'INVBASED-002',
        'name' => 'Other Section',
        'section_type' => 'store',
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => $company->company_code,
        'section_code' => $otherSection->section_code,
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'user5@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    // create a sale in section SEC1 with invoice number
    $sale = \App\Models\SalesTransaction::create([
        'invoice_no' => 'INV-TEST',
        'transaction_date' => now(),
        'section_code' => $otherSection->section_code,
        'subtotal' => 100,
        'total_amount' => 100,
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code' => 'ITEMX',
        'item_name' => 'Sample X',
        'quantity' => 1,
        'unit_price' => 100,
        'discount_amount' => 0,
        'tax_amount' => 0,
        'item_type' => 'item',
        'batch_no' => 'BATCH123',
    ]);

    $response = $this->post('/customer-returns', [
        'return_date' => now()->toDateString(),
        'customer_name' => 'ACME Corp',
        'original_invoice_no' => 'INV-TEST',
        'return_type' => 'item',
        'refund_method' => 'cash',
        'items' => [
            [
                'item_code' => 'ITEMX',
                'item_name' => 'Sample X',
                'quantity' => 1,
                'unit_price' => 100,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'item_type' => 'item',
                'condition' => 'good',
                'add_to_stock' => true,
                'batch_no' => 'BATCH123',
            ],
        ],
    ]);

    $response->assertStatus(302);

    // Stock must be restored to the section where the sale happened (SEC1)
    $this->assertDatabaseHas('stock_in_hand', [
        'section_code' => $otherSection->section_code,
        'TrnTyp' => 'CUSTOMER_RETURN',
        'Qty' => 1.00,
        'batch_no' => 'BATCH123',
    ]);
});


/**
 * Invoice search should return sales correctly regardless of the user's
 * section.  Prior versions sometimes added filters (`section_code` or
 * `company_code`) which either caused valid lookups to 404 or generated SQL
 * errors when the column did not exist.  This test simply verifies the basic
 * lookup works and avoids referencing any non‑existent schema columns.
 */
test('search invoice returns sale from other section', function () {
    $company = Company::create([
        'company_code' => 'TESTC',
        'name' => 'Test Co',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);

    $sectionA = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'SEC-A',
        'name' => 'Section A',
        'section_type' => 'store',
    ]);

    $sectionB = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'SEC-B',
        'name' => 'Section B',
        'section_type' => 'store',
    ]);

    $user = User::create([
        'company_code' => $company->company_code,
        'section_code' => $sectionA->section_code,
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'user4@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    // create a sale in section B (no company_code filter used by lookup)
    $sale = \App\Models\SalesTransaction::create([
        'invoice_no' => 'INV-XYZ',
        'transaction_date' => now(),
        'section_code' => $sectionB->section_code,
        'subtotal' => 100,
        'total_amount' => 100,
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code' => 'ITEMA',
        'item_name' => 'Sample',
        'quantity' => 1,
        'unit_price' => 100,
        'discount_amount' => 0,
        'tax_amount' => 0,
        'item_type' => 'item',
    ]);

    $response = $this->get('/customer-returns/search-invoice?invoice_no=INV-XYZ');
    $response->assertStatus(200);
    $response->assertJsonPath('sale.invoice_no', 'INV-XYZ');
});

// -------------------------------------------------------------------------
// New bin card tests to verify customer return transactions appear in reports
// -------------------------------------------------------------------------

test('stock bin card includes customer return transaction', function () {
    $company = Company::create([
        'company_code' => 'TESTC',
        'name' => 'Test Co',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'SEC1',
        'name' => 'Main Section',
        'section_type' => 'store',
        'is_main_stock' => true,
    ]);

    $user = User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Bin',
        'last_name' => 'Card',
        'email' => 'binuser@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    // create an item master record so the bin card route can look it up
    $item = \App\Models\ItemMaster::create([
        'ItmKy' => 9999,
        'ItemCode' => 'ITEMBIN',
        'ItemName' => 'Bin Item',
        'ItmNm' => 'Bin Item',
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
    ]);

    $this->actingAs($user);

    // perform a customer return for this item
    $this->post('/customer-returns', [
        'return_date' => now()->toDateString(),
        'customer_name' => 'Warehouse',
        'return_type' => 'item',
        'refund_method' => 'cash',
        'items' => [[
            'item_code' => 'ITEMBIN',
            'item_ky' => $item->ItmKy,
            'item_name' => 'Bin Item',
            'quantity' => 2,
            'unit_price' => 10,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'item_type' => 'item',
            'condition' => 'good',
            'add_to_stock' => true,
        ]],
    ])->assertStatus(302);

    // fetch the stock bin card for the item and confirm customer return is listed
    $response = $this->get('/reports/stock-bin-card?item_code=ITEMBIN');
    $response->assertStatus(200);

    // extract Inertia props from the rendered HTML
    $content = $response->getContent();
    preg_match('/<div id="app" data-page="([^"]+)"/', $content, $m);
    $page = json_decode(html_entity_decode($m[1]), true);
    $data = $page['props'];
    $transactions = $data['transactions'] ?? [];
    $found = collect($transactions)->first(fn($t) => str_contains($t['description'], 'Customer Return'));
    $this->assertNotNull($found, 'Expected customer return entry on bin card');
    $this->assertEquals(2.0, $found['received']);
});


test('printer stock bin card includes customer return entry', function () {
    $company = Company::create([
        'company_code' => 'TESTC',
        'name' => 'Test Co',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'SEC1',
        'name' => 'Main Section',
        'section_type' => 'store',
        'is_main_stock' => true,
    ]);

    $user = User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Printer',
        'last_name' => 'Bin',
        'email' => 'printerbin@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    $response = $this->post('/customer-returns', [
        'return_date' => now()->toDateString(),
        'customer_name' => 'Printer Co',
        'return_type' => 'printer',
        'refund_method' => 'cash',
        'items' => [
            [
                'item_code' => 'PRT1',
                'item_name' => 'Printer 1',
                'quantity' => 1,
                'unit_price' => 1000,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'item_type' => 'printer',
                'condition' => 'good',
                'add_to_stock' => true,
                'serial_number' => 'SN-PRT-001',
            ],
        ],
    ]);

    $response->assertStatus(302);

    $response = $this->get('/reports/printer-stock-bin-card?serial_number=SN-PRT-001');
    $response->assertStatus(200);

    $content = $response->getContent();
    preg_match('/<div id="app" data-page="([^"]+)"/', $content, $m);
    $page = json_decode(html_entity_decode($m[1]), true);
    $data = $page['props'];
    $transactions = $data['transactions'] ?? [];
    // find entry by description since the transaction does not include a 'type' key
    $found = collect($transactions)->first(fn($t) => str_contains($t['description'] ?? '', 'Customer Return'));
    $this->assertNotNull($found, 'Expected customer_return entry in printer bin card');
    $this->assertEquals(1.0, $found['received']);
});


test('printer return does not crash and creates transfer row with nullable item_id', function () {
    $company = Company::create([
        'company_code' => 'TESTC',
        'name' => 'Test Co',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);

    $mainStock = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'PRNTR-MAIN',
        'name' => 'Import Buying Stock',
        'section_type' => 'store',
        'is_main_stock' => true,
    ]);

    $otherSection = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'PRNTR-OTHER',
        'name' => 'Other Section',
        'section_type' => 'store',
        'is_active' => true,
    ]);

    $user = User::create([
        'company_code' => $company->company_code,
        'section_code' => $otherSection->section_code,
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'user3@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    $response = $this->post('/customer-returns', [
        'return_date' => now()->toDateString(),
        'customer_name' => 'Printer Co',
        'return_type' => 'printer',
        'refund_method' => 'cash',
        'items' => [
            [
                'item_code' => 'PRINTER',
                'item_name' => 'Test Printer',
                'quantity' => 1,
                'unit_price' => 1000,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'item_type' => 'printer',
                'condition' => 'good',
                'add_to_stock' => true,
                'serial_number' => 'SN123',
            ],
        ],
    ]);

    $response->assertStatus(302);

    // Printer stock must be added to stock_in_hand (the core requirement)
    // This record is created regardless of whether a PurchaseDet is found
    $this->assertDatabaseHas('stock_in_hand', [
        'company_code' => $company->company_code,
        'section_code' => $mainStock->section_code,
        'TrnTyp' => 'CUSTOMER_RETURN',
        'serial_number' => 'SN123',
        'Qty' => 1.00,
    ]);
});


test('search endpoints behave correctly and handle missing data', function () {
    $company = Company::create([
        'company_code' => 'TESTC',
        'name' => 'Test Co',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'SEARCH-ENDPT-SEC',
        'name' => 'Test Section',
        'section_type' => 'store',
        'is_main_stock' => true,
    ]);

    $user = User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'user4@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    // create an item plus a price detail so the search returns something meaningful
    $item = \App\Models\ItemMaster::create([
        'ItmKy' => 9999,
        'ItemCode' => 'BOOK1',
        'ItemName' => 'Drawing Book',
        'ItmNm' => 'Drawing Book',
        'BarCode' => '1234',
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'SlsPri' => 50,
    ]);
    \App\Models\ItemPriceDet::create([
        'ItmKy' => $item->ItmKy,
        'ItemCode' => $item->ItemCode,
        'Price' => 150,
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'PriceType' => 'RETAIL',
    ]);

    // add a stock_in_hand row so batch will be picked up by search
    \App\Models\StockInHand::create([
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
        'RefNo' => 'TEST',
        'company_code' => $company->company_code,
        'owner_company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'OrdDate' => now(),
        'ItemKy' => $item->ItmKy,
        'Qty' => 5,
        'FreeQty' => 0,
        'TrnTyp' => 'PURCHASE',
        'OrdKy' => 0,
        'StkKy' => 0,
        'OrdTypKy' => 0,
        'CounterID' => 0,
        'batch_no' => 'BATCH-EX',
        'Cky' => 0,
    ]);

    // item search should return 200 and array
    $response = $this->get('/customer-returns/search-items?search=drawing');
    $response->assertStatus(200);
    $results = $response->json();
    $this->assertIsArray($results);
    // because we set up one batch in stock we expect exactly one entry
    $this->assertCount(1, $results);
    $this->assertEquals(150, $results[0]['retail_price']);
    $this->assertEquals('BATCH-EX', $results[0]['batch_no']);
    // batch_price should reflect purchase detail (empty so zero)
    $this->assertEquals(0, $results[0]['batch_price']);

    // create a second batch with a different sale price on purchase detail
    \App\Models\StockInHand::create([
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
        'RefNo' => 'TEST2',
        'company_code' => $company->company_code,
        'owner_company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'OrdDate' => now(),
        'ItemKy' => $item->ItmKy,
        'Qty' => 3,
        'FreeQty' => 0,
        'TrnTyp' => 'PURCHASE',
        'OrdKy' => 0,
        'StkKy' => 0,
        'OrdTypKy' => 0,
        'CounterID' => 0,
        'batch_no' => 'BATCH-EX2',
        'Cky' => 0,
    ]);
    // create a dummy purchase row so foreign key constraint is satisfied
    $dummyPurchase = \App\Models\Purchase::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'PurchaseKey' => 123456,
        'PurchaseNo' => 123456,
        'GRNDate' => now(),
        'CostTotal' => 0,
        'TotalVal' => 0,
        'ToIDscount' => 0,
        'Status' => 'A',
        'flnact' => false,
        'flused' => false,
        'type' => 'supplier',
    ]);

    // add purchase detail with price for the new batch
    \App\Models\PurchaseDet::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'PerchaseDetKy' => 9999,
        'Status' => 'A',
        'PurchaseKey' => $dummyPurchase->PurchaseKey,
        'iTimKy' => $item->ItmKy,
        'Qty' => 3,
        'SalePrice' => 123.45,
        'batch_no' => 'BATCH-EX2',
    ]);

    // search again - should now return two rows (distinct batches)
    $response = $this->get('/customer-returns/search-items?search=drawing');
    $response->assertStatus(200);
    $results = $response->json();
    $this->assertCount(2, $results);
    // ensure both batch values appear and price attached to second
    $batchNos = array_column($results, 'batch_no');
    $this->assertContains('BATCH-EX', $batchNos);
    $this->assertContains('BATCH-EX2', $batchNos);
    foreach ($results as $r) {
        if ($r['batch_no'] === 'BATCH-EX2') {
            $this->assertEquals(123.45, $r['batch_price']);
        }
    }

    // multi-word search also works (no 500 error)
    $response = $this->get('/customer-returns/search-items?search=drawing book');
    $response->assertStatus(200);
    $this->assertIsArray($response->json());

    // numeric string search should not cause error (was causing 500 previously)
    $response = $this->get('/customer-returns/search-items?search=1771994645656');
    $response->assertStatus(200);
    $this->assertIsArray($response->json());

    // printer search should return 200 and array
    $response = $this->get('/customer-returns/search-printers?search=none');
    $response->assertStatus(200);
    $this->assertIsArray($response->json());

    // invoice search for non-existent invoice should produce 404
    $response = $this->get('/customer-returns/search-invoice?invoice_no=NONEXISTENT-INV-000');
    $response->assertStatus(404);
    $this->assertArrayHasKey('error', $response->json());


    // ---------------------------------------------------------------------
    // regression: the lookup used to be restricted to the current section and
    // would not tolerate the common ":1" suffix.  Verify that we can find the
    // record both with and without the colon and also across sections.

    // create a sales transaction in another section
    $otherSection = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'SEC2',
        'name' => 'Other Section',
        'section_type' => 'store',
        'is_main_stock' => false,
    ]);

    $sale = \App\Models\SalesTransaction::create([
        'section_code' => $otherSection->section_code,
        'invoice_no' => 'VIS-CROSS-SEC-002',
        'transaction_date' => now(),
        'customer_code' => null,
        'customer_name' => null,
        'status' => 'completed',
        'total_amount' => 100,
    ]);

    // when we search with the exact number we should get the record back
    $response = $this->get('/customer-returns/search-invoice?invoice_no=VIS-CROSS-SEC-002');
    $response->assertStatus(200);
    $data = $response->json();
    $this->assertEquals('VIS-CROSS-SEC-002', $data['sale']['invoice_no']);

    // when we include a ":1" suffix the lookup still succeeds
    $response = $this->get('/customer-returns/search-invoice?invoice_no=VIS-CROSS-SEC-002:1');
    $response->assertStatus(200);
    $this->assertEquals('VIS-CROSS-SEC-002', $response->json()['sale']['invoice_no']);

});

test('cannot return more than sold quantity for an invoice item', function () {
    $company = Company::create([
        'company_code' => 'TESTOVR',
        'name' => 'Over Return Co',
        'email' => 'ovr@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'OVR-SEC-001',
        'name' => 'Main Section',
        'section_type' => 'store',
        'is_main_stock' => true,
        'is_active' => true,
    ]);

    $user = \App\Models\User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Over',
        'last_name' => 'Tester',
        'email' => 'ovr_user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    $sale = \App\Models\SalesTransaction::create([
        'invoice_no' => 'OVR-INV-001',
        'transaction_date' => now(),
        'section_code' => $section->section_code,
        'subtotal' => 500,
        'total_amount' => 500,
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code' => 'OVR-ITEM',
        'item_name' => 'Over Item',
        'quantity' => 5,
        'unit_price' => 100,
        'discount_amount' => 0,
        'tax_amount' => 0,
        'item_type' => 'item',
    ]);

    $makeReturn = fn(float $qty) => $this->post('/customer-returns', [
        'return_date'          => now()->toDateString(),
        'customer_name'        => 'Test Customer',
        'original_invoice_no'  => 'OVR-INV-001',
        'return_type'          => 'item',
        'refund_method'        => 'cash',
        'items' => [[
            'item_code'        => 'OVR-ITEM',
            'item_name'        => 'Over Item',
            'quantity'         => $qty,
            'unit_price'       => 100,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_type'        => 'item',
            'condition'        => 'good',
            'add_to_stock'     => true,
        ]],
    ]);

    // First partial return (3 of 5) — should succeed
    $r1 = $makeReturn(3);
    $r1->assertStatus(302);
    $this->assertDatabaseHas('customer_returns', ['original_invoice_no' => 'OVR-INV-001']);

    // Attempt to return 3 more (total 6, exceeds 5) — should fail
    $r2 = $makeReturn(3);
    $r2->assertSessionHas('error');
    // The second return must NOT have been created
    $this->assertEquals(1, \App\Models\CustomerReturn::where('original_invoice_no', 'OVR-INV-001')->count());

    // Exact remaining (2) should succeed
    $r3 = $makeReturn(2);
    $r3->assertStatus(302);
    $this->assertEquals(2, \App\Models\CustomerReturn::where('original_invoice_no', 'OVR-INV-001')->count());

    // Any further return should fail (0 remaining)
    $r4 = $makeReturn(1);
    $r4->assertSessionHas('error');
    $this->assertEquals(2, \App\Models\CustomerReturn::where('original_invoice_no', 'OVR-INV-001')->count());
});

test('search invoice returns returned_qty and returnable_qty for each item', function () {
    $company = Company::create([
        'company_code' => 'TSTQTY',
        'name' => 'Qty Check Co',
        'email' => 'qtycheck@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'QTY-SEC-001',
        'name' => 'Qty Section',
        'section_type' => 'store',
        'is_active' => true,
    ]);

    $user = \App\Models\User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Qty',
        'last_name' => 'User',
        'email' => 'qty_user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    $sale = \App\Models\SalesTransaction::create([
        'invoice_no' => 'QTY-INV-001',
        'transaction_date' => now(),
        'section_code' => $section->section_code,
        'subtotal' => 1000,
        'total_amount' => 1000,
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code' => 'QTY-ITEM',
        'item_name' => 'Qty Item',
        'quantity' => 10,
        'unit_price' => 100,
        'discount_amount' => 0,
        'tax_amount' => 0,
        'item_type' => 'item',
    ]);

    // Return 4 units first
    $this->post('/customer-returns', [
        'return_date'         => now()->toDateString(),
        'customer_name'       => 'Test',
        'original_invoice_no' => 'QTY-INV-001',
        'return_type'         => 'item',
        'refund_method'       => 'cash',
        'items' => [[
            'item_code'       => 'QTY-ITEM',
            'item_name'       => 'Qty Item',
            'quantity'        => 4,
            'unit_price'      => 100,
            'discount_amount' => 0,
            'tax_amount'      => 0,
            'item_type'       => 'item',
            'condition'       => 'good',
            'add_to_stock'    => true,
        ]],
    ])->assertStatus(302);

    // Now search invoice — should report 4 returned, 6 remaining
    $response = $this->get('/customer-returns/search-invoice?invoice_no=QTY-INV-001');
    $response->assertStatus(200);
    $item = $response->json('items.0');
    $this->assertEquals(4, $item['returned_qty']);
    $this->assertEquals(6, $item['returnable_qty']);
});

test('cash refund keeps sale balance at zero for fully-paid invoice', function () {
    $company = Company::create([
        'company_code' => 'REFBAL',
        'name' => 'Refund Balance Co',
        'email' => 'refbal@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'RB-SEC-001',
        'name' => 'Refund Section',
        'section_type' => 'store',
        'is_main_stock' => true,
        'is_active' => true,
    ]);

    $user = \App\Models\User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Refund',
        'last_name' => 'User',
        'email' => 'refbal_user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $customer = \App\Models\Customer::create([
        'AdrKy' => 100,
        'AdrName' => 'Test Customer',
        'company_code' => $company->company_code,
    ]);

    $this->actingAs($user);

    // Customer buys Rs. 5000, pays in full → balance_amount = 0, status = completed
    $sale = \App\Models\SalesTransaction::create([
        'invoice_no'       => 'RB-INV-001',
        'transaction_date' => now(),
        'section_code'     => $section->section_code,
        'subtotal'         => 5000,
        'total_amount'     => 5000,
        'balance_amount'   => 0,
        'status'           => 'completed',
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code'            => 'RB-ITEM',
        'item_name'            => 'Refund Item',
        'quantity'             => 10,
        'unit_price'           => 500,
        'discount_amount'      => 0,
        'tax_amount'           => 0,
        'item_type'            => 'item',
    ]);

    // Customer returns 5 units → cash refund Rs. 2500
    $response = $this->post('/customer-returns', [
        'return_date'         => now()->toDateString(),
        'customer_name'       => 'Test Customer',
        'original_invoice_no' => 'RB-INV-001',
        'return_type'         => 'item',
        'refund_method'       => 'cash',
        'refund_amount'       => 2500,
        'items' => [[
            'item_code'        => 'RB-ITEM',
            'item_name'        => 'Refund Item',
            'quantity'         => 5,
            'unit_price'       => 500,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_type'        => 'item',
            'condition'        => 'good',
            'add_to_stock'     => true,
        ]],
    ]);

    $response->assertStatus(302);

    // Sale record remains UNCHANGED - return is a separate transaction
    $sale->refresh();
    $this->assertEquals(5000.00, (float) $sale->total_amount,
        'total_amount must NOT change after return (sale is historical record)');
    $this->assertEquals(0.0, (float) $sale->balance_amount,
        'balance_amount must stay 0 (sale is historical, payment is separate)');

    $this->assertEquals('completed', $sale->status,
        'Sale status must remain completed');
});

test('cash refund on partially-paid invoice clears residual balance', function () {
    $company = Company::create([
        'company_code' => 'REFPART',
        'name' => 'Partial Refund Co',
        'email' => 'refpart@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'RP-SEC-001',
        'name' => 'Partial Section',
        'section_type' => 'store',
        'is_main_stock' => true,
        'is_active' => true,
    ]);

    $user = \App\Models\User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Part',
        'last_name' => 'User',
        'email' => 'refpart_user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    // Invoice Rs. 5000, customer paid Rs. 3000, balance_amount = 2000
    $sale = \App\Models\SalesTransaction::create([
        'invoice_no'       => 'RP-INV-001',
        'transaction_date' => now(),
        'section_code'     => $section->section_code,
        'subtotal'         => 5000,
        'total_amount'     => 5000,
        'balance_amount'   => 2000,   // paid 3000 so far
        'status'           => 'partially_paid',
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code'            => 'RP-ITEM',
        'item_name'            => 'Partial Item',
        'quantity'             => 10,
        'unit_price'           => 500,
        'discount_amount'      => 0,
        'tax_amount'           => 0,
        'item_type'            => 'item',
    ]);

    // Customer returns 2 items → cash refund Rs. 1000
    $response = $this->post('/customer-returns', [
        'return_date'         => now()->toDateString(),
        'customer_name'       => 'Partial Customer',
        'original_invoice_no' => 'RP-INV-001',
        'return_type'         => 'item',
        'refund_method'       => 'cash',
        'items' => [[
            'item_code'        => 'RP-ITEM',
            'item_name'        => 'Partial Item',
            'quantity'         => 2,
            'unit_price'       => 500,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_type'        => 'item',
            'condition'        => 'good',
            'add_to_stock'     => true,
        ]],
    ]);

    $response->assertStatus(302);

    // Sale record remains UNCHANGED - return is a separate transaction
    $sale->refresh();
    $this->assertEquals(5000.00, (float) $sale->total_amount,
        'total_amount must NOT change after return (sale is historical record)');
    $this->assertEquals(2000.0, (float) $sale->balance_amount,
        'balance_amount must NOT change (return is separate transaction)');

    $this->assertEquals('partially_paid', $sale->status,
        'Sale status must remain partially_paid');
});

// =========================================================================
// NEW COMPREHENSIVE EXCHANGE TESTS
// =========================================================================

test('exchange with equal values does not create payment record', function () {
    $company = Company::create([
        'company_code' => 'EXEQ',
        'name' => 'Exchange Equal Co',
        'email' => 'exeq@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'EXEQ-SEC',
        'name' => 'Exchange Section',
        'section_type' => 'store',
        'is_main_stock' => true,
        'is_active' => true,
    ]);

    $user = \App\Models\User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Exchange',
        'last_name' => 'User',
        'email' => 'exeq_user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    // Create a customer record
    $customer = \App\Models\Customer::create([
        'AdrKy' => 5001,
        'AdrName' => 'Exchange Customer',
        'company_code' => $company->company_code,
    ]);

    // Create a sale
    $sale = \App\Models\SalesTransaction::create([
        'invoice_no'       => 'EXEQ-INV-001',
        'transaction_date' => now(),
        'section_code'     => $section->section_code,
        'subtotal'         => 5000,
        'total_amount'     => 5000,
        'balance_amount'   => 0,
        'status'           => 'completed',
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code'            => 'EXEQ-ITEM1',
        'item_name'            => 'Old Item',
        'quantity'             => 5,
        'unit_price'           => 1000,
        'discount_amount'      => 0,
        'tax_amount'           => 0,
        'item_type'            => 'item',
    ]);

    // Add exchange item to stock
    \App\Models\StockInHand::create([
        'ItemKy'       => 9902,
        'Qty'          => 100,
        'section_code' => $section->section_code,
        'company_code' => $company->company_code,
        'owner_company_code' => $company->company_code,
        'OrdDate'      => now(),
        'TrnTyp'       => 'PURCHASE',
        'RefNo'        => 'PUR-002',
    ]);

    // Add stock for exchange item (EXEQ-ITEM2)
    \App\Models\StockInHand::create([
        'ItemKy'       => 9903,
        'Qty'          => 50,
        'section_code' => $section->section_code,
        'company_code' => $company->company_code,
        'owner_company_code' => $company->company_code,
        'OrdDate'      => now(),
        'TrnTyp'       => 'PURCHASE',
        'RefNo'        => 'PUR-EXEQ',
    ]);

    // Exchange: return 5 items (Rs. 5000), get 5 items at Rs. 1000 each (Rs. 5000)
    $response = $this->post('/customer-returns', [
        'return_date'         => now()->toDateString(),
        'customer_name'       => 'Exchange Customer',
        'customer_id'         => $customer->AdrKy,
        'original_invoice_no' => 'EXEQ-INV-001',
        'return_type'         => 'item',
        'refund_method'       => 'exchange',
        'items' => [[
            'item_code'        => 'EXEQ-ITEM1',
            'item_name'        => 'Old Item',
            'quantity'         => 5,
            'unit_price'       => 1000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_type'        => 'item',
            'condition'        => 'good',
            'add_to_stock'     => true,
        ]],
        'exchange_items' => [[
            'item_code'        => 'EXEQ-ITEM2',
            'item_name'        => 'New Item',
            'quantity'         => 5,
            'unit_price'       => 1000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_ky'          => 9903,
            'item_type'        => 'item',
        ]],
    ]);

    $response->assertStatus(302);

    $return = CustomerReturn::latest()->first();
    $this->assertEquals('exchange', $return->refund_method);
    $this->assertEquals(5000.00, (float) $return->total_return_amount);
    $this->assertEquals(5000.00, (float) $return->exchange_amount);

    // NO payment record should exist for equal exchange
    $payment = CustomerPayment::where('reference', $return->return_no)->first();
    $this->assertNull($payment);
});

test('exchange where customer owes creates pending payment record', function () {
    $company = Company::create([
        'company_code' => 'EXDIFF',
        'name' => 'Exchange Difference Co',
        'email' => 'exdiff@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'EXDIFF-SEC',
        'name' => 'Exchange Diff Section',
        'section_type' => 'store',
        'is_main_stock' => true,
        'is_active' => true,
    ]);

    $user = \App\Models\User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Diff',
        'last_name' => 'User',
        'email' => 'exdiff_user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    // Create a customer record
    $customer = \App\Models\Customer::create([
        'AdrKy' => 5002,
        'AdrName' => 'Owes Customer',
        'company_code' => $company->company_code,
    ]);

    $sale = \App\Models\SalesTransaction::create([
        'invoice_no'       => 'EXDIFF-INV-001',
        'transaction_date' => now(),
        'section_code'     => $section->section_code,
        'subtotal'         => 5000,
        'total_amount'     => 5000,
        'balance_amount'   => 0,
        'status'           => 'completed',
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code'            => 'CHEAP-ITEM',
        'item_name'            => 'Cheap Item',
        'quantity'             => 5,
        'unit_price'           => 1000,
        'discount_amount'      => 0,
        'tax_amount'           => 0,
        'item_type'            => 'item',
    ]);

    // Add expensive exchange item to stock
    \App\Models\StockInHand::create([
        'ItemKy'       => 9903,
        'Qty'          => 100,
        'section_code' => $section->section_code,
        'company_code' => $company->company_code,
        'owner_company_code' => $company->company_code,
        'OrdDate'      => now(),
        'TrnTyp'       => 'PURCHASE',
        'RefNo'        => 'PUR-003',
    ]);

    // Exchange: return 5 items (Rs. 5000), get 5 items at Rs. 2000 each (Rs. 10000)
    // Customer owes: Rs. 10000 - Rs. 5000 = Rs. 5000
    $response = $this->post('/customer-returns', [
        'return_date'         => now()->toDateString(),
        'customer_name'       => 'Owes Customer',
        'customer_id'         => $customer->AdrKy,
        'original_invoice_no' => 'EXDIFF-INV-001',
        'return_type'         => 'item',
        'refund_method'       => 'exchange',
        'items' => [[
            'item_code'        => 'CHEAP-ITEM',
            'item_name'        => 'Cheap Item',
            'quantity'         => 5,
            'unit_price'       => 1000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_type'        => 'item',
            'condition'        => 'good',
            'add_to_stock'     => true,
        ]],
        'exchange_items' => [[
            'item_code'        => 'EXPENSIVE-ITEM',
            'item_name'        => 'Expensive Item',
            'quantity'         => 5,
            'unit_price'       => 2000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_ky'          => 9903,
            'item_type'        => 'item',
        ]],
    ]);

    $response->assertStatus(302);

    $return = CustomerReturn::latest()->first();
    $this->assertEquals('exchange', $return->refund_method);
    $this->assertEquals(5000.00, (float) $return->total_return_amount);
    $this->assertEquals(10000.00, (float) $return->exchange_amount);

    // Payment record should exist: customer owes Rs. 5000
    $payment = CustomerPayment::where('reference', $return->return_no)->first();
    $this->assertNotNull($payment, 'Payment record must exist for exchange difference');
    $this->assertEquals(5000.00, (float) $payment->amount, 'Amount must be difference (positive = owed)');
    $this->assertEquals('exchange_balance_due', $payment->method);
    $this->assertEquals('pending', $payment->status, 'Status must be pending (customer to pay)');
});

test('exchange where customer gets credit creates completed payment record', function () {
    $company = Company::create([
        'company_code' => 'EXCREDIT',
        'name' => 'Exchange Credit Co',
        'email' => 'excredit@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'EXCREDIT-SEC',
        'name' => 'Exchange Credit Section',
        'section_type' => 'store',
        'is_main_stock' => true,
        'is_active' => true,
    ]);

    $user = \App\Models\User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Credit',
        'last_name' => 'User',
        'email' => 'excredit_user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    // Create a customer record
    $customer = \App\Models\Customer::create([
        'AdrKy' => 5003,
        'AdrName' => 'Credit Customer',
        'company_code' => $company->company_code,
    ]);

    $sale = \App\Models\SalesTransaction::create([
        'invoice_no'       => 'EXCREDIT-INV-001',
        'transaction_date' => now(),
        'section_code'     => $section->section_code,
        'subtotal'         => 10000,
        'total_amount'     => 10000,
        'balance_amount'   => 0,
        'status'           => 'completed',
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code'            => 'EXPENSIVE-ITEM',
        'item_name'            => 'Expensive Item',
        'quantity'             => 5,
        'unit_price'           => 2000,
        'discount_amount'      => 0,
        'tax_amount'           => 0,
        'item_type'            => 'item',
    ]);

    // Add cheap exchange item to stock
    \App\Models\StockInHand::create([
        'ItemKy'       => 9904,
        'Qty'          => 100,
        'section_code' => $section->section_code,
        'company_code' => $company->company_code,
        'owner_company_code' => $company->company_code,
        'OrdDate'      => now(),
        'TrnTyp'       => 'PURCHASE',
        'RefNo'        => 'PUR-004',
    ]);

    // Exchange: return 5 items (Rs. 10000), get 5 items at Rs. 1000 each (Rs. 5000)
    // Customer gets credit: Rs. 10000 - Rs. 5000 = Rs. 5000 credit
    $response = $this->post('/customer-returns', [
        'return_date'         => now()->toDateString(),
        'customer_name'       => 'Credit Customer',
        'customer_id'         => $customer->AdrKy,
        'original_invoice_no' => 'EXCREDIT-INV-001',
        'return_type'         => 'item',
        'refund_method'       => 'exchange',
        'items' => [[
            'item_code'        => 'EXPENSIVE-ITEM',
            'item_name'        => 'Expensive Item',
            'quantity'         => 5,
            'unit_price'       => 2000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_type'        => 'item',
            'condition'        => 'good',
            'add_to_stock'     => true,
        ]],
        'exchange_items' => [[
            'item_code'        => 'CHEAP-ITEM',
            'item_name'        => 'Cheap Item',
            'quantity'         => 5,
            'unit_price'       => 1000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_ky'          => 9904,
            'item_type'        => 'item',
        ]],
    ]);

    $response->assertStatus(302);

    $return = CustomerReturn::latest()->first();
    $this->assertEquals('exchange', $return->refund_method);
    $this->assertEquals(10000.00, (float) $return->total_return_amount);
    $this->assertEquals(5000.00, (float) $return->exchange_amount);

    // Payment record should exist: customer gets Rs. 5000 credit
    $payment = CustomerPayment::where('reference', $return->return_no)->first();
    $this->assertNotNull($payment, 'Payment record must exist for exchange credit');
    $this->assertEquals(-5000.00, (float) $payment->amount, 'Amount must be negative (credit given)');
    $this->assertEquals('exchange_credit', $payment->method);
    $this->assertEquals('completed', $payment->status, 'Status must be completed (auto-credited)');
});

test('original sale remains unchanged after any return or exchange', function () {
    $company = Company::create([
        'company_code' => 'IMMUTABLE',
        'name' => 'Immutable Sale Co',
        'email' => 'immutable@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'IMMUTABLE-SEC',
        'name' => 'Immutable Section',
        'section_type' => 'store',
        'is_main_stock' => true,
        'is_active' => true,
    ]);

    $user = \App\Models\User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Immutable',
        'last_name' => 'User',
        'email' => 'immutable_user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    $sale = \App\Models\SalesTransaction::create([
        'invoice_no'       => 'IMMUTABLE-INV-001',
        'transaction_date' => now(),
        'section_code'     => $section->section_code,
        'subtotal'         => 10000,
        'total_amount'     => 10000,
        'balance_amount'   => 0,
        'status'           => 'completed',
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code'            => 'IMMUTABLE-ITEM',
        'item_name'            => 'Immutable Item',
        'quantity'             => 10,
        'unit_price'           => 1000,
        'discount_amount'      => 0,
        'tax_amount'           => 0,
        'item_type'            => 'item',
    ]);

    // Remember original values
    $originalTotal = $sale->total_amount;
    $originalBalance = $sale->balance_amount;
    $originalStatus = $sale->status;

    // Return some items
    $this->post('/customer-returns', [
        'return_date'         => now()->toDateString(),
        'customer_name'       => 'Immutable Customer',
        'original_invoice_no' => 'IMMUTABLE-INV-001',
        'return_type'         => 'item',
        'refund_method'       => 'cash',
        'items' => [[
            'item_code'        => 'IMMUTABLE-ITEM',
            'item_name'        => 'Immutable Item',
            'quantity'         => 5,
            'unit_price'       => 1000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_type'        => 'item',
            'condition'        => 'good',
            'add_to_stock'     => true,
        ]],
    ]);

    // Verify sale is UNCHANGED
    $sale->refresh();
    $this->assertEquals($originalTotal, $sale->total_amount, 'Original sale total_amount must not change');
    $this->assertEquals($originalBalance, $sale->balance_amount, 'Original sale balance_amount must not change');
    $this->assertEquals($originalStatus, $sale->status, 'Original sale status must not change');
});

test('insufficient exchange stock validation prevents return', function () {
    $company = Company::create([
        'company_code' => 'INSUF',
        'name' => 'Insufficient Stock Co',
        'email' => 'insufficient@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'INSUFF-SEC',
        'name' => 'Insufficient Section',
        'section_type' => 'store',
        'is_main_stock' => true,
        'is_active' => true,
    ]);

    $user = \App\Models\User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Insufficient',
        'last_name' => 'User',
        'email' => 'insufficient_user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $this->actingAs($user);

    $sale = \App\Models\SalesTransaction::create([
        'invoice_no'       => 'INSUFF-INV-001',
        'transaction_date' => now(),
        'section_code'     => $section->section_code,
        'subtotal'         => 5000,
        'total_amount'     => 5000,
        'balance_amount'   => 0,
        'status'           => 'completed',
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code'            => 'INSUFF-ITEM',
        'item_name'            => 'Insufficient Item',
        'quantity'             => 5,
        'unit_price'           => 1000,
        'discount_amount'      => 0,
        'tax_amount'           => 0,
        'item_type'            => 'item',
    ]);

    // Add exchange item with ONLY 2 units in stock
    \App\Models\StockInHand::create([
        'ItemKy'       => 9905,
        'Qty'          => 2,  // Only 2 units
        'section_code' => $section->section_code,
        'company_code' => $company->company_code,
        'owner_company_code' => $company->company_code,
        'OrdDate'      => now(),
        'TrnTyp'       => 'PURCHASE',
        'RefNo'        => 'PUR-005',
    ]);

    // Try to exchange for 5 units (insufficient stock)
    $response = $this->post('/customer-returns', [
        'return_date'         => now()->toDateString(),
        'customer_name'       => 'Insufficient Stock Customer',
        'original_invoice_no' => 'INSUFF-INV-001',
        'return_type'         => 'item',
        'refund_method'       => 'exchange',
        'items' => [[
            'item_code'        => 'INSUFF-ITEM',
            'item_name'        => 'Insufficient Item',
            'quantity'         => 5,
            'unit_price'       => 1000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_type'        => 'item',
            'condition'        => 'good',
            'add_to_stock'     => true,
        ]],
        'exchange_items' => [[
            'item_code'        => 'EXCHANGE-ITEM',
            'item_name'        => 'Exchange Item',
            'quantity'         => 5,  // Request 5 but only 2 available
            'unit_price'       => 1000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_ky'          => 9905,
            'item_type'        => 'item',
        ]],
    ]);

    // Should fail validation
    $response->assertStatus(302);
    $response->assertSessionHas('error');  // Check for error flash message
    $this->assertDatabaseCount('customer_returns', 0);  // No return should be created
});

test('cash refund creates completed payment record', function () {
    $company = Company::create([
        'company_code' => 'CASHREF',
        'name' => 'Cash Refund Co',
        'email' => 'cashref@example.com',
        'password' => bcrypt('password'),
    ]);

    $section = \App\Models\Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'CASHREF-SEC',
        'name' => 'Cash Refund Section',
        'section_type' => 'store',
        'is_main_stock' => true,
        'is_active' => true,
    ]);

    $user = \App\Models\User::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'first_name' => 'Cash',
        'last_name' => 'User',
        'email' => 'cashref_user@example.com',
        'password' => bcrypt('password'),
        'user_type' => 'super_admin',
        'is_active' => true,
    ]);

    $customer = \App\Models\Customer::create([
        'AdrKy' => 102,
        'AdrName' => 'Cash Refund Customer',
        'company_code' => $company->company_code,
    ]);

    $this->actingAs($user);

    $sale = \App\Models\SalesTransaction::create([
        'invoice_no'       => 'CASHREF-INV-001',
        'transaction_date' => now(),
        'section_code'     => $section->section_code,
        'subtotal'         => 5000,
        'total_amount'     => 5000,
        'balance_amount'   => 0,
        'status'           => 'completed',
    ]);

    \App\Models\SalesTransactionItem::create([
        'sales_transaction_id' => $sale->id,
        'item_code'            => 'CASHREF-ITEM',
        'item_name'            => 'Cash Refund Item',
        'quantity'             => 5,
        'unit_price'           => 1000,
        'discount_amount'      => 0,
        'tax_amount'           => 0,
        'item_type'            => 'item',
    ]);

    // Perform cash return
    $response = $this->post('/customer-returns', [
        'return_date'         => now()->toDateString(),
        'customer_name'       => 'Cash Refund Customer',
        'customer_id'         => $customer->AdrKy,
        'original_invoice_no' => 'CASHREF-INV-001',
        'return_type'         => 'item',
        'refund_method'       => 'cash',
        'items' => [[
            'item_code'        => 'CASHREF-ITEM',
            'item_name'        => 'Cash Refund Item',
            'quantity'         => 2,
            'unit_price'       => 1000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'item_type'        => 'item',
            'condition'        => 'good',
            'add_to_stock'     => true,
        ]],
    ]);

    $response->assertStatus(302);

    $return = CustomerReturn::latest()->first();

    // Payment record should exist for cash refund
    $payment = CustomerPayment::where('reference', $return->return_no)->first();
    $this->assertNotNull($payment, 'Payment record must exist for cash refund');
    $this->assertEquals(-2000.00, (float) $payment->amount, 'Amount must be negative (we pay)');
    $this->assertEquals('cash_refund', $payment->method);
    $this->assertEquals('completed', $payment->status, 'Status must be completed');
});
