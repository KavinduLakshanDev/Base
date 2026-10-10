<?php

use App\Models\Company;
use App\Models\User;
use App\Models\Role;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);

beforeEach(function () {
    Role::firstOrCreate(['slug' => 'company_admin'], ['name' => 'Company Admin', 'level' => 'company_admin']);
});

it('limits suppliers in dropdown and lookup to the logged-in company', function () {
    $companyA = Company::factory()->create(['company_code' => 'C1']);
    $companyB = Company::factory()->create(['company_code' => 'C2']);

    $adminRole = Role::where('slug', 'company_admin')->first();
    $viewer = User::factory()->create(['company_code' => 'C1', 'role_id' => $adminRole->id]);

    // create supplier for each company
    $accA = \App\Models\AccMas::create([
        'AccCd' => 'SUP1',
        'AccNm' => 'Supplier A',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 0,
        'CrLmt' => 0,
        'company_code' => 'C1',
    ]);
    \App\Models\Address::create([
        'AccKy' => $accA->AccKy,
        'AdrCd' => 'SUP1',
        'AdrTypKy' => 1,
        'FstNm' => 'A',
        'LstNm' => 'One',
        'company_code' => 'C1',
    ]);

    $accB = \App\Models\AccMas::create([
        'AccCd' => 'SUP2',
        'AccNm' => 'Supplier B',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 0,
        'CrLmt' => 0,
        'company_code' => 'C2',
    ]);
    \App\Models\Address::create([
        'AccKy' => $accB->AccKy,
        'AdrCd' => 'SUP2',
        'AdrTypKy' => 1,
        'FstNm' => 'B',
        'LstNm' => 'Two',
        'company_code' => 'C2',
    ]);

    $resp = $this->actingAs($viewer)->get('/reports/supplier-ledger');
    $resp->assertStatus(200);
    $resp->assertInertia(fn(Assert $page) =>
        $page->component('Reports/SupplierLedger')
             ->has('suppliers', 1)
             ->where('suppliers.0.AdrCd', 'SUP1')
    );

    // attempt to select the other company supplier
    $resp2 = $this->actingAs($viewer)->get('/reports/supplier-ledger?supplier_id=SUP2');
    $resp2->assertStatus(200);
    $resp2->assertInertia(fn(Assert $page) =>
        $page->component('Reports/SupplierLedger')
             ->doesntHave('selectedSupplier')
    );
});
