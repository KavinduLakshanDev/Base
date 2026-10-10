<?php

use App\Models\Company;
use App\Models\User;
use App\Models\Section;
use App\Models\StockInHand;
use App\Models\Role;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);

// basic smoke test for wastage report behaviour

test('wastage report provides section list and can filter by section', function () {
    $company = Company::factory()->create(['company_code' => 'C1']);
    $user = User::factory()->create(['company_code' => 'C1']);

    // give user permission via role
    $role = Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
    $user->role_id = $role->id;
    $user->save();
    $perm = \App\Models\Permission::firstOrCreate(
        ['slug' => 'reports.wastage'],
        ['name' => 'View Wastage Report', 'description' => 'Can view wastage reports', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $role->permissions()->syncWithoutDetaching([$perm->id]);

    // create two sections
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

    // store wastage records via StockInHand factory
    StockInHand::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'TrnTyp' => 'WASTAGE',
        'OrdDate' => now()->toDateString(),
        'Qty' => -5,
    ]);

    StockInHand::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-B',
        'TrnTyp' => 'WASTAGE',
        'OrdDate' => now()->toDateString(),
        'Qty' => -3,
    ]);

    $from = now()->subDay()->format('Y-m-d');
    $to = now()->format('Y-m-d');

    // no filter should show both sections
    $resp = $this->actingAs($user)->get("/wastage?from_date={$from}&to_date={$to}");
    $resp->assertStatus(200);
    $resp->assertInertia(fn(Assert $page) => $page
        ->component('Reports/WastageReport')
        ->has('sections', 2)
        ->has('wastageData', 2)
    );

    // filter by section A
    $resp2 = $this->actingAs($user)->get("/wastage?from_date={$from}&to_date={$to}&section={$sectionA->id}");
    $resp2->assertStatus(200);
    $resp2->assertInertia(fn(Assert $page) => $page
        ->where('filters.section', (string) $sectionA->id)
        ->has('wastageData', 1)
    );
});
