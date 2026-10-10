<?php

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

// ensure setup matches seeder logic
beforeEach(function () {
    Role::firstOrCreate(
        ['slug' => 'cashier'],
        ['name' => 'Cashier', 'level' => 'section_user']
    );
    Role::firstOrCreate(
        ['slug' => 'company_admin'],
        ['name' => 'Company Admin', 'level' => 'company_admin']
    );

    // ensure the create permission exists so we can attach it later
    $perm = Permission::firstOrCreate(
        ['slug' => 'day_opening_balances.create'],
        ['name' => 'Create Day Opening Balances', 'uuid' => (string) Str::uuid()]
    );

    // give the cashier role all opening-balance related perms so tests can hit pages
    $cashier = Role::where('slug', 'cashier')->first();
    if ($cashier) {
        $related = Permission::whereIn('slug', [
            'day_opening_balances.create',
            'day_opening_balances.view',
            'day_opening_balances.edit',
            'day_opening_balances.delete',
            'day_opening_balances.manage',
        ])->get();
        $cashier->permissions()->syncWithoutDetaching($related->pluck('id'));
    }
});

it('company admin sees all company users on the create form', function () {
    $cashierRole = Role::where('slug', 'cashier')->first();
    $adminRole = Role::where('slug', 'company_admin')->first();

    $companyId = null;
    // create two users in the same company and one outside
    $first = User::factory()->create();
    $first->role_id = $cashierRole->id;
    $first->save();
    $companyId = $first->company_code;

    $second = User::factory()->create(['company_code' => $companyId]);
    $second->role_id = $adminRole->id;
    $second->save();

    $outside = User::factory()->create();
    $outside->role_id = $cashierRole->id;
    $outside->save();

    $acting = User::factory()->create(['company_code' => $companyId]);
    $acting->role_id = $adminRole->id;
    $acting->save();

    $response = $this->actingAs($acting)
                     ->get(route('admin.day-opening-balances.create'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/day-opening-balances/create')
        // should include at least the two sample users plus acting admin
        ->where('users', fn ($users) => collect($users)->pluck('id')->unique()->count() >= 3)
        // ensure the two sample users appear somewhere in list
        ->where('users', fn ($users) => collect($users)->pluck('id')->contains($first->id) && collect($users)->pluck('id')->contains($second->id))
        ->where('isCashier', false)
        ->where('isCompanyAdmin', true)
        ->where('currentUser.id', $acting->id)
    );
});

it('company admin with company-specific slug also sees whole company', function () {
    $cashierRole = Role::where('slug', 'cashier')->first();
    $adminRole = Role::firstOrCreate(
        ['slug' => 'vis001_company_admin'],
        ['name' => 'Company Admin (vis001)', 'level' => 'company_admin', 'company_code' => 'VIS001']
    );

    $companyId = 'VIS001';
    // two users in the same company
    $first = User::factory()->create(['company_code' => $companyId]);
    $first->role_id = $cashierRole->id;
    $first->save();

    $second = User::factory()->create(['company_code' => $companyId]);
    $second->role_id = $cashierRole->id;
    $second->save();

    $acting = User::factory()->create(['company_code' => $companyId]);
    $acting->role_id = $adminRole->id;
    $acting->save();

    $response = $this->actingAs($acting)
                     ->get(route('admin.day-opening-balances.create'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        // at least the three users we created should be present
        ->where('users', fn ($users) => collect($users)->pluck('id')->unique()->count() >= 3)
        ->where('isCompanyAdmin', true)
    );
});

it('default to logged-in cashier when they open create form', function () {
    // use whichever cashier role exists; if a company-specific slug is present,
    // it should still behave the same.
    $cashierRole = Role::where('slug', 'cashier')
                     ->orWhere('slug', 'like', '%_cashier')
                     ->first();

    $this->assertNotNull($cashierRole, 'no cashier role exists in DB');

    $cashier = User::factory()->create();
    $cashier->role_id = $cashierRole->id;
    $cashier->save();


    $response = $this->actingAs($cashier)
                     ->get(route('admin.day-opening-balances.create'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/day-opening-balances/create')
        ->has('users', 1)
        ->where('users.0.id', $cashier->id)
        ->where('isCashier', true)
        ->where('currentUser.id', $cashier->id)
    );

    // front-end payload should contain the cashier's name somewhere in the JSON
    $content = $response->getContent();
    $this->assertStringContainsString($cashier->first_name, $content);
    $this->assertStringContainsString($cashier->last_name, $content);
});

it('also works with company-specific cashier slug', function () {
    // create a role ending in _cashier and assign it
    $role = Role::firstOrCreate(
        ['slug' => 'vis001_cashier'],
        ['name' => 'Cashier (Vismass)', 'level' => 'cashier', 'company_code' => 'VIS001']
    );

    $cashier = User::factory()->create();
    $cashier->role_id = $role->id;
    $cashier->save();

    $response = $this->actingAs($cashier)
                     ->get(route('admin.day-opening-balances.create'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/day-opening-balances/create')
        ->has('users', 1)
        ->where('isCashier', true)
    );

    // and ensure store endpoint accepts a payload (no 403)
    $payload = [
        'user_id' => $cashier->id,
        'balance_date' => now()->toDateString(),
        'opening_balance' => 50,
        'currency' => 'LKR',
    ];

    $post = $this->actingAs($cashier)->post(route('admin.day-opening-balances.store'), $payload);
    // cashier posts must succeed (201 or redirect)
    $post->assertStatus(302);
});



it('index includes username for cashier in returned balances', function () {
    $cashierRole = Role::where('slug', 'cashier')->first();
    $adminRole = Role::where('slug', 'company_admin')->first();

    $cashier = User::factory()->create([
        'username' => 'cashier_code',
        'company_code' => 'TEST',
        'section_code' => 'SEC1',
    ]);
    $cashier->role_id = $cashierRole->id;
    $cashier->save();

    $admin = User::factory()->create([
        'company_code' => $cashier->company_code,
        'section_code' => $cashier->section_code,
    ]);
    $admin->role_id = $adminRole->id;
    $admin->save();

    // create a balance record
    \App\Models\DayOpeningBalance::create([
        'user_id' => $cashier->id,
        'balance_date' => now()->toDateString(),
        'opening_balance' => 500,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => $cashier->company_code,
        'section_code' => $cashier->section_code,
        'created_by' => $admin->id,
    ]);

    $response = $this->actingAs($admin)
                     ->get(route('admin.day-opening-balances.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/day-opening-balances/index')
        // expect at least one balance (the one we created)
        ->where('balances.data', fn ($items) => count($items) >= 1)
        ->where('balances.data.0.user.username', 'cashier_code')
    );
});
