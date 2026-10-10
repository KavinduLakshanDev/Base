<?php

use App\Models\Company;
use App\Models\Section;
use App\Models\Address;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockInHand;
use App\Services\NumberGeneratorService;
use Tests\TestCase;

/**
 * @uses TestCase
 */

it('auto-generates batch_no and saves to purchase and stock_in_hand tables', function () {
    /** @var TestCase $this */
    // Create test data
    $company = Company::create([
        'company_code' => 'TEST',
        'name' => 'Test Company',
        'email' => 'test@example.com',
        'password' => 'password'
    ]);

    $section = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'BR001',
        'name' => 'Test Branch',
        'section_type' => 'store'
    ]);

    $supplier = Address::create([
        'AdrCd' => 'SUP001',
        'FstNm' => 'Test',
        'LstNm' => 'Supplier',
        'company_code' => $company->company_code,
        'AccKy' => 1,
        'Status' => 'A'
    ]);

    $product = Product::create([
        'ItmKy' => 1,
        'ItemCode' => 'PROD001',
        'ItmNm' => 'Test Product',
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'Status' => 'A'
    ]);

    // Create a user (assuming we have authentication)
    $user = \App\Models\User::create([
        'name' => 'Test User',
        'email' => 'user@example.com',
        'password' => 'password',
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'role_id' => 1, // Super admin
        'user_type' => 'super_admin',
    ]);

    // Act as the user
    $this->actingAs($user);

    // Prepare purchase data
    $purchaseData = [
        'type' => 'supplier',
        'supplier_code' => $supplier->AdrCd,
        'company_id' => $company->id,
        'branch_id' => $section->id,
        'grn_date' => '2024-01-01',
        'supplier_invoice_no' => 'INV001',
        'description' => 'Test GRN',
        'batch_no' => null, // Should auto-generate
        'items' => [
            [
                'product_id' => 1, // ItmKy as integer
                'qty' => 10,
                'cost_price' => 100.00,
                'normal_cost' => 95.00,
                'discount_rate' => 5,
                'free_qty' => 1,
                'retail_price' => 120.00,
                'wholesale_price' => 110.00,
                'extra_price' => 105.00,
                'cc_price' => 115.00,
                'new_cost_price' => 98.00,
            ]
        ],
        'total_amount' => 1000.00,
        'total_discount' => 50.00,
        'total_payable' => 950.00,
    ];

    // Make the POST request to create GRN
    $response = $this->post(route('pos.purchases.store'), $purchaseData);

    // Debug: check response
    if ($response->status() !== 302) {
        dd($response->getContent());
    }

    // Assert redirect (successful creation)
    $response->assertRedirect();

    // Check if it redirected to index (success) or back (error)
    $targetUrl = $response->getTargetUrl();
    if ($targetUrl && str_contains($targetUrl, 'purchases') && str_contains($targetUrl, 'purchase_id')) {
        // Success redirect
        expect(true)->toBe(true);
    } else {
        // Error redirect - check for errors
        $this->fail('Purchase creation failed. Target URL: ' . $targetUrl . ', Errors: ' . json_encode(session('errors')));
    }

    // Verify purchase was created with auto-generated batch_no
    $purchase = Purchase::where('company_code', $company->company_code)
        ->where('section_code', $section->section_code)
        ->latest('PurchaseKey')
        ->first();

    expect($purchase)->not->toBeNull();
    expect($purchase->batch_no)->not->toBeNull();
    expect($purchase->batch_no)->toMatch('/^GRN-TES-BR0-\d{4}$/'); // Format: GRN-TES-BR0-XXXX

    // Verify batch_no is saved to stock_in_hand
    $stockEntries = StockInHand::where('company_code', $company->company_code)
        ->where('section_code', $section->section_code)
        ->where('batch_no', $purchase->batch_no)
        ->get();

    expect($stockEntries)->toHaveCount(1);
    expect($stockEntries->first()->batch_no)->toBe($purchase->batch_no);
    expect($stockEntries->first()->Qty)->toEqual(10.00);
    expect($stockEntries->first()->FreeQty)->toEqual(1.00);
    expect($stockEntries->first()->TrnTyp)->toBe('GRN');
});

it('uses provided batch_no when specified', function () {
    /** @var TestCase $this */
    // Create test data
    $company = Company::create([
        'company_code' => 'TEST2',
        'name' => 'Test Company 2',
        'email' => 'test2@example.com',
        'password' => 'password'
    ]);

    $section = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'BR002',
        'name' => 'Test Branch 2',
        'section_type' => 'store'
    ]);

    $supplier = Address::create([
        'AdrCd' => 'SUP002',
        'FstNm' => 'Test',
        'LstNm' => 'Supplier 2',
        'company_code' => $company->company_code,
        'AccKy' => 2,
        'Status' => 'A'
    ]);

    $product = Product::create([
        'ItmKy' => '2',
        'ItemCode' => 'PROD002',
        'ItmNm' => 'Test Product 2',
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'Status' => 'A'
    ]);

    $user = \App\Models\User::create([
        'name' => 'Test User 2',
        'email' => 'user2@example.com',
        'password' => 'password',
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'role_id' => 1,
        'user_type' => 'super_admin',
    ]);

    $this->actingAs($user);

    $customBatchNo = 'CUSTOM-BATCH-1234';

    $purchaseData = [
        'type' => 'supplier',
        'supplier_code' => $supplier->AdrCd,
        'company_id' => $company->id,
        'branch_id' => $section->id,
        'grn_date' => '2024-01-01',
        'supplier_invoice_no' => 'INV002',
        'description' => 'Test GRN with custom batch',
        'batch_no' => $customBatchNo,
        'items' => [
            [
                'product_id' => 2,
                'qty' => 5,
                'cost_price' => 50.00,
            ]
        ],
        'total_amount' => 250.00,
        'total_discount' => 0,
        'total_payable' => 250.00,
    ];

    $response = $this->post(route('pos.purchases.store'), $purchaseData);
    $response->assertRedirect();

    $purchase = Purchase::where('company_code', $company->company_code)
        ->where('section_code', $section->section_code)
        ->latest('PurchaseKey')
        ->first();

    expect($purchase->batch_no)->toBe($customBatchNo);

    $stockEntries = StockInHand::where('batch_no', $customBatchNo)->get();
    expect($stockEntries)->toHaveCount(1);
    expect($stockEntries->first()->batch_no)->toBe($customBatchNo);
});

it('generates unique batch numbers for different GRNs', function () {
    /** @var TestCase $this */
    // Create test data
    $company = Company::create([
        'company_code' => 'TEST3',
        'name' => 'Test Company 3',
        'email' => 'test3@example.com',
        'password' => 'password'
    ]);

    $section = Section::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_code' => $company->company_code,
        'section_code' => 'BR003',
        'name' => 'Test Branch 3',
        'section_type' => 'store'
    ]);

    $supplier = Address::create([
        'AdrCd' => 'SUP003',
        'FstNm' => 'Test',
        'LstNm' => 'Supplier 3',
        'company_code' => $company->company_code,
        'AccKy' => 3,
        'Status' => 'A'
    ]);

    $product = Product::create([
        'ItmKy' => '3',
        'ItemCode' => 'PROD003',
        'ItmNm' => 'Test Product 3',
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'Status' => 'A'
    ]);

    $user = \App\Models\User::create([
        'name' => 'Test User 3',
        'email' => 'user3@example.com',
        'password' => 'password',
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'role_id' => 1,
        'user_type' => 'super_admin',
    ]);

    $this->actingAs($user);

    // Create first GRN
    $purchaseData1 = [
        'type' => 'supplier',
        'supplier_code' => $supplier->AdrCd,
        'company_id' => $company->id,
        'branch_id' => $section->id,
        'grn_date' => '2024-01-01',
        'supplier_invoice_no' => 'INV003',
        'description' => 'First GRN',
        'batch_no' => null,
        'items' => [
            [
                'product_id' => 3,
                'qty' => 1,
                'cost_price' => 10.00,
            ]
        ],
        'total_amount' => 10.00,
        'total_discount' => 0,
        'total_payable' => 10.00,
    ];

    $this->post(route('pos.purchases.store'), $purchaseData1);

    $firstPurchase = Purchase::where('company_code', $company->company_code)
        ->where('section_code', $section->section_code)
        ->latest('PurchaseKey')
        ->first();

    // Create second GRN
    $purchaseData2 = [
        'type' => 'supplier',
        'supplier_code' => $supplier->AdrCd,
        'company_id' => $company->id,
        'branch_id' => $section->id,
        'grn_date' => '2024-01-02',
        'supplier_invoice_no' => 'INV004',
        'description' => 'Second GRN',
        'batch_no' => null,
        'items' => [
            [
                'product_id' => 3,
                'qty' => 1,
                'cost_price' => 10.00,
            ]
        ],
        'total_amount' => 10.00,
        'total_discount' => 0,
        'total_payable' => 10.00,
    ];

    $this->post(route('pos.purchases.store'), $purchaseData2);

    $secondPurchase = Purchase::where('company_code', $company->company_code)
        ->where('section_code', $section->section_code)
        ->latest('PurchaseKey')
        ->first();

    // Assert batch numbers are different
    expect($firstPurchase->batch_no)->not->toBe($secondPurchase->batch_no);
    expect($firstPurchase->batch_no)->toMatch('/^GRN-TES-BR0-\d{4}$/');
    expect($secondPurchase->batch_no)->toMatch('/^GRN-TES-BR0-\d{4}$/');
});