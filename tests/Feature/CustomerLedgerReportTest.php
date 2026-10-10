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

it('returns only customers belonging to the logged in company and ignores other-company codes when filtering', function () {
    // set up two companies and one customer each
    $companyA = Company::factory()->create(['company_code' => 'C1']);
    $companyB = Company::factory()->create(['company_code' => 'C2']);

    $adminRole = Role::where('slug', 'company_admin')->first();
    $viewer = User::factory()->create(['company_code' => 'C1', 'role_id' => $adminRole->id]);

    // create a customer record for each company
    $accA = \App\Models\AccMas::create([
        'AccCd' => 'CUS1',
        'AccNm' => 'Customer A',
        'AccTyp' => 'CUSTOMER',
        'CurBal' => 0,
        'CrLmt' => 0,
        'company_code' => 'C1',
    ]);
    $addrA = \App\Models\Address::create([
        'AccKy' => $accA->AccKy,
        'AdrCd' => 'CUS1',
        'AdrTypKy' => 1,
        'FstNm' => 'A',
        'LstNm' => 'One',
        'company_code' => 'C1',
    ]);

    $accB = \App\Models\AccMas::create([
        'AccCd' => 'CUS2',
        'AccNm' => 'Customer B',
        'AccTyp' => 'CUSTOMER',
        'CurBal' => 0,
        'CrLmt' => 0,
        'company_code' => 'C2',
    ]);
    $addrB = \App\Models\Address::create([
        'AccKy' => $accB->AccKy,
        'AdrCd' => 'CUS2',
        'AdrTypKy' => 1,
        'FstNm' => 'B',
        'LstNm' => 'Two',
        'company_code' => 'C2',
    ]);

    // request page as company A user
    $response = $this->actingAs($viewer)->get('/reports/customer-ledger');
    $response->assertStatus(200);
    $response->assertInertia(fn(Assert $page) =>
        $page->component('Reports/CustomerLedger')
             ->has('customers', 1)
             ->where('customers.0.AdrCd', 'CUS1')
    );

    // also try passing other-company customer id; should not populate selectedCustomer
    $response2 = $this->actingAs($viewer)->get('/reports/customer-ledger?customer_id=CUS2');
    $response2->assertStatus(200);
    $response2->assertInertia(fn(Assert $page) =>
        $page->component('Reports/CustomerLedger')
             ->doesntHave('selectedCustomer')
    );
});
