<?php

use App\Models\Company;
use App\Models\User;
use App\Models\Role;
use App\Models\Purchase;
use App\Models\Address;
use Carbon\Carbon;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);

beforeEach(function () {
    Role::firstOrCreate(['slug' => 'company_admin'], ['name' => 'Company Admin', 'level' => 'company_admin']);
});

it('filters purchase orders by supplier and belongs to company', function () {
    $company = Company::factory()->create(['company_code' => 'C1']);
    $adminRole = Role::where('slug', 'company_admin')->first();
    $user = User::factory()->create(['company_code' => 'C1', 'role_id' => $adminRole->id]);

    // ensure purchase order permission exists and attach to role
    $perm = \App\Models\Permission::firstOrCreate(
        ['slug' => 'reports.purchase_orders'],
        ['name' => 'View Purchase Order Report', 'description' => 'Can view purchase order reports', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $adminRole->permissions()->syncWithoutDetaching([$perm->id]);

    // create two suppliers
    $suppA = Address::create([ 'AdrCd' => 'SUP1', 'FstNm' => 'A', 'LstNm' => 'One', 'company_code' => 'C1' ]);
    $suppB = Address::create([ 'AdrCd' => 'SUP2', 'FstNm' => 'B', 'LstNm' => 'Two', 'company_code' => 'C1' ]);

    // purchases for each supplier
    Purchase::create([
        'PurchaseKey' => 'P1',
        'PurchaseNo' => 1,
        'GRNDate' => Carbon::now()->format('Y-m-d'),
        'SuppCode' => 'SUP1',
        'TotalVal' => 100,
        'company_code' => 'C1',
    ]);
    Purchase::create([
        'PurchaseKey' => 'P2',
        'PurchaseNo' => 2,
        'GRNDate' => Carbon::now()->format('Y-m-d'),
        'SuppCode' => 'SUP2',
        'TotalVal' => 200,
        'company_code' => 'C1',
    ]);

    // request without filter
    $resp = $this->actingAs($user)->get('/reports/purchase-orders');
    $resp->assertStatus(200);
    $resp->assertInertia(fn(Assert $page) =>
        $page->component('Reports/PurchaseOrderReport')
             ->has('reportData', 2)
    );

    // apply filter for SUP1
    $resp2 = $this->actingAs($user)->get('/reports/purchase-orders?supplier_id=SUP1');
    $resp2->assertStatus(200);
    $resp2->assertInertia(fn(Assert $page) =>
        $page->component('Reports/PurchaseOrderReport')
             ->has('reportData', 1)
             ->where('reportData.0.supplier_name', 'A One')
    );

    // make sure supplier from other company ignored
    $otherCompany = Company::factory()->create(['company_code' => 'C2']);
    Address::create([ 'AdrCd' => 'SUPX', 'FstNm' => 'X', 'LstNm' => 'Other', 'company_code' => 'C2' ]);
    $resp3 = $this->actingAs($user)->get('/reports/purchase-orders?supplier_id=SUPX');
    $resp3->assertStatus(200);
    $resp3->assertInertia(fn(Assert $page) =>
        $page->component('Reports/PurchaseOrderReport')
             ->has('reportData', 0)
    );
});
