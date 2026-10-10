<?php

use App\Models\Company;
use App\Models\User;
use App\Models\Section;
use App\Models\SalesTransaction;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);

test('sales report provides section list and can filter by section', function () {
    $company = Company::factory()->create(['company_code' => 'C1']);
    $user = User::factory()->create(['company_code' => 'C1']);

    // attach permission so user can view sales report
    $role = \App\Models\Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
    $user->role_id = $role->id;
    $user->save();
    $perm = \App\Models\Permission::firstOrCreate(
        ['slug' => 'reports.sales'],
        ['name' => 'View Sales Report', 'description' => 'Can view sales reports', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $role->permissions()->syncWithoutDetaching([$perm->id]);

    // create two sections for this company
    $sectionA = Section::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'name' => 'Section A',
    ]);
    $sectionB = Section::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-B',
        'name' => 'Section B',
    ]);

    // sales transactions in each section
    SalesTransaction::factory()->create([
        'section_code' => 'SEC-A',
        'transaction_date' => now()->toDateString(),
        'status' => 'completed',
    ]);

    SalesTransaction::factory()->create([
        'section_code' => 'SEC-B',
        'transaction_date' => now()->toDateString(),
        'status' => 'completed',
    ]);

    $from = now()->subDay()->format('Y-m-d');
    $to = now()->format('Y-m-d');

    // request without section filter should return both rows and include sections
    $resp = $this->actingAs($user)->get("/reports/sales?from_date={$from}&to_date={$to}");
    $resp->assertStatus(200);
    $resp->assertInertia(fn(Assert $page) => $page
        ->component('Reports/SalesReport')
        ->where('company.name', $company->company_name) // ensure logged‑in company is supplied
        ->has('salesData.daily_summaries', 2)
        ->has('sections', 2)
    );

    // apply filter for SEC-A
    $resp2 = $this->actingAs($user)->get("/reports/sales?from_date={$from}&to_date={$to}&section_code=SEC-A");
    $resp2->assertStatus(200);
    $resp2->assertInertia(fn(Assert $page) => $page
        ->component('Reports/SalesReport')
        ->where('company.name', $company->company_name)
        ->where('filters.section_code', 'SEC-A')
        ->has('salesData.daily_summaries', 1)
    );
});


test('pdf download includes company name in content', function () {
    $company = Company::factory()->create(['company_code' => 'C1', 'company_name' => 'Acme Corp']);
    $user = User::factory()->create(['company_code' => 'C1']);

    // give user report permission for pdf test
    $role = \App\Models\Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
    $user->role_id = $role->id;
    $user->save();
    $perm = \App\Models\Permission::firstOrCreate(
        ['slug' => 'reports.sales'],
        ['name' => 'View Sales Report', 'description' => 'Can view sales reports', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $role->permissions()->syncWithoutDetaching([$perm->id]);

    // need at least one completed transaction so PDF generation doesn't crash
    SalesTransaction::factory()->create([
        'section_code' => null,
        'transaction_date' => now()->toDateString(),
        'status' => 'completed',
        'company_code' => 'C1',
    ]);

    $from = now()->subDay()->format('Y-m-d');
    $to = now()->format('Y-m-d');

    $resp = $this->actingAs($user)->get("/reports/sales/pdf?from_date={$from}&to_date={$to}");
    $resp->assertStatus(200);
    $resp->assertHeader('content-type', 'application/pdf');

    // PDF bytes should still contain company name string
    $this->assertStringContainsString('Acme Corp', $resp->getContent());
});
