<?php

use App\Models\Company;
use App\Models\Section;
use App\Models\StockInHand;
use App\Models\StockTransfer;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

it('can display printer transfers index page', function () {
    // super admin bypasses permission checks
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'TEST',
        'section_code' => 'MAIN',
    ]);
    $this->actingAs($user);

    $response = $this->get(route('printer-transfers.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('PrinterTransfer/Index')
        ->has('stockTransfers')
    );
});

it('can display create printer transfer page', function () {
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'TEST',
        'section_code' => 'MAIN',
    ]);
    $this->actingAs($user);

    $response = $this->get(route('printer-transfers.create'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('PrinterTransfer/Create')
        ->has('sections')
    );
});

it('can search printers', function () {
    $company = Company::factory()->create();
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => $company->company_code,
        'section_code' => null,
    ]);
    $section = Section::factory()->create(['company_code' => $company->company_code]);
    $user->update(['company_code' => $company->company_code]);

    // Create some stock with printers
    $stock = StockInHand::factory()->create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'serial_number' => 'TEST123',
        'brand' => 'Test Brand',
        'model' => 'Test Model',
        'Qty' => 1,
    ]);

    // Ensure there is a purchase record so the foreign key constraint is satisfied
    DB::table('purchase')->insert([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'PurchaseKey' => 1,
        'PurchaseNo' => 1,
        'type' => 'supplier',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Also add a purchase_det row with CostPrice and a discounted NewCostPrice
    DB::table('purchase_det')->insert([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'PerchaseDetKy' => 1,
        'PurchaseKey' => 1,
        'iTimKy' => $stock->ItemKy,
        'Qty' => 1,
        'CostPrice' => 100.00,
        'NewCostPrice' => 95.00, // 5% supplier discount applied
        'batch_no' => null,
        'brand' => 'Test Brand',
        'model' => 'Test Model',
        'warranty' => null,
        'serial_number' => 'TEST123',
    ]);

    $this->actingAs($user);

    $response = $this->get(route('printer-transfers.search-printers', [
        'from_section_code' => $section->section_code,
        'serial_number' => 'TEST123'
    ]));

    $response->assertStatus(200);
    $response->assertJsonStructure([
        '*' => [
            'id',
            'item' => [
                'ItmKy',
                'ItemCode',
                'ItmNm'
            ],
            'brand',
            'model',
            'serial_number',
            'qty',
            'section_code',
            'cost_price'
        ]
    ]);

    // ensure cost_price returned is the discounted NewCostPrice (95.00) not the original cost
    $data = $response->json();
    // convert to float for comparison since SQL may return string with precision
    expect((float) $data[0]['cost_price'])->toBe(95.00);
});

it('can get section trf in stock', function () {
    $company = Company::factory()->create();
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => $company->company_code,
        'section_code' => null,
    ]);
    $section = Section::factory()->create(['company_code' => $company->company_code]);
    $user->update(['company_code' => $company->company_code]);

    // Create a purchase record first (we hardcode PurchaseKey=1 so that purchase_det foreign key works)
    DB::table('purchase')->insert([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'PurchaseKey' => 1,
        'PurchaseNo' => 1,
        'type' => 'supplier',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Create 7 different printers (each with unique serial number)
    for ($i = 1; $i <= 7; $i++) {
        $serialNumber = 'TEST' . str_pad($i, 3, '0', STR_PAD_LEFT);
        
        // Create stock in the section (with serial number to identify as printer)
        $stock = StockInHand::factory()->create([
            'company_code' => $company->company_code,
            'section_code' => $section->section_code,
            'serial_number' => $serialNumber,
            'batch_no' => 'BATCH001',
            'Qty' => 1,
            'FreeQty' => 0,
        ]);

        // Create matching purchase_det record for complete printer information
        DB::table('purchase_det')->insert([
            'company_code' => $company->company_code,
            'section_code' => $section->section_code,
            'PerchaseDetKy' => $i,
            // match the PurchaseKey from the earlier manual insert (1)
            'PurchaseKey' => 1,
            'iTimKy' => $stock->ItemKy,
            'serial_number' => $serialNumber,
            'batch_no' => 'BATCH001',
            'brand' => 'Test Brand',
            'model' => 'Test Model',
            'warranty' => '1 year',
            'Qty' => 1,
        ]);
    }

    $this->actingAs($user);

    $response = $this->get(route('printer-transfers.section-trf-in-stock', [
        'section_code' => $section->section_code
    ]));

    $response->assertStatus(200);
    $response->assertJson([
        'section_code' => $section->section_code,
        'total_trf_in_stock' => 7, // 7 unique printers
    ]);
});

it('can create printer transfer', function () {
    $company = Company::factory()->create();
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => $company->company_code,
        'section_code' => null,
    ]);
    $fromSection = Section::factory()->create(['company_code' => $company->company_code]);
    $toSection = Section::factory()->create(['company_code' => $company->company_code]);
    $user->update(['company_code' => $company->company_code]);

    $stock = StockInHand::factory()->create([
        'company_code' => $company->company_code,
        'section_code' => $fromSection->section_code,
        'serial_number' => 'TRANSFER123',
        'Qty' => 2,
    ]);

    $this->actingAs($user);

    $transferData = [
        'from_section_code' => $fromSection->section_code,
        'to_section_code' => $toSection->section_code,
        'stock_transfers' => [
            [
                'stock_id' => $stock->TableKy,
                'quantity' => 1,
                'serial_number' => 'TRANSFER123',
                'brand' => 'Test Brand',
                'model' => 'Test Model',
            ]
        ],
        'transfer_date' => now()->format('Y-m-d'),
        'notes' => 'Test transfer',
    ];

    $response = $this->post(route('printer-transfers.store'), $transferData);

    // controller redirects back with success message rather than to index
    $response->assertRedirect();
    $response->assertSessionHas('success');
    $this->assertDatabaseHas('stock_transfers', [
        'from_section_code' => $fromSection->section_code,
        'to_section_code' => $toSection->section_code,
        'quantity' => 1,
        'company_code' => $company->company_code,
    ]);
});

it('validates printer transfer data', function () {
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'TEST',
        'section_code' => 'MAIN',
    ]);
    $this->actingAs($user);

    $response = $this->post(route('printer-transfers.store'), []);

    $response->assertRedirect();
    $response->assertSessionHasErrors(['from_section_code', 'to_section_code', 'stock_transfers']);
});

it('can preview pdf', function () {
    $company = Company::factory()->create();
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => $company->company_code,
        'section_code' => null,
    ]);
    $fromSection = Section::factory()->create(['company_code' => $company->company_code]);
    $toSection = Section::factory()->create(['company_code' => $company->company_code]);
    $user->update(['company_code' => $company->company_code]);

    $stock = StockInHand::factory()->create([
        'company_code' => $company->company_code,
        'section_code' => $fromSection->section_code,
        'serial_number' => 'PDF123',
        'Qty' => 1,
    ]);

    $this->actingAs($user);

    $pdfData = [
        'from_section_code' => $fromSection->section_code,
        'to_section_code' => $toSection->section_code,
        'transfer_date' => now()->format('Y-m-d'),
        'notes' => 'PDF Preview Test',
        'stock_transfers' => [
            [
                'stock_id' => $stock->TableKy,
                'quantity' => 1,
                'serial_number' => 'PDF123',
            ]
        ],
    ];

    $response = $this->post(route('printer-transfers.preview-pdf'), $pdfData);

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');
});