<?php

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\SalesTransaction;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

// Cashier should only see their own transactions on the index page
test('cashier index shows only own sales', function () {
    // setup role and permission
    $role = Role::create(['name' => 'Cashier', 'slug' => 'cashier', 'level' => 'section_user', 'guard_name' => 'web']);
    $perm = Permission::create(['name' => 'sales.view', 'slug' => 'sales.view', 'uuid' => (string) \Illuminate\Support\Str::uuid(), 'guard_name' => 'web']);
    $role->permissions()->attach($perm->id);

    $user = User::factory()->create();
    $user->role_id = $role->id;
    // give the user a known company/section so index filtering works
    $user->company_code = 'TESTCO';
    $user->section_code = 'SEC1';
    $user->save();
    // ensure company exists before adding section (foreign key requirement)
    \App\Models\Company::factory()->create(['company_code' => 'TESTCO']);
    \App\Models\Section::factory()->create([
        'company_code' => 'TESTCO',
        'section_code' => 'SEC1',
    ]);

    // create two sales, one for this cashier and one for someone else
    SalesTransaction::create([
        'cashier_id' => $user->id,
        'invoice_no' => 'INV-OWN',
        'total_amount' => 100,
        'transaction_date' => now(),
        'status' => 'completed',
        'section_code' => 'SEC1',
        'company_code' => 'TESTCO',
    ]);

    SalesTransaction::create([
        'cashier_id' => $user->id + 1,
        'invoice_no' => 'INV-OTHER',
        'total_amount' => 200,
        'transaction_date' => now(),
        'status' => 'completed',
        'section_code' => 'SEC1',
        'company_code' => 'TESTCO',
    ]);

    $resp = $this->actingAs($user)->get('/sales');
    $resp->assertOk();
    $resp->assertInertia(fn ($page) =>
        $page->component('Sales/Index')
             ->has('sales.data', 1)
             ->where('sales.data.0.invoice_no', 'INV-OWN')
    );
});

// Company admin should see all sales for the section/company
test('company admin index shows all sales', function () {
    $role = Role::create(['name' => 'Company Admin', 'slug' => 'company_admin', 'level' => 'company_admin', 'guard_name' => 'web']);
    $perm = Permission::create(['name' => 'sales.view', 'slug' => 'sales.view', 'uuid' => (string) \Illuminate\Support\Str::uuid(), 'guard_name' => 'web']);
    $role->permissions()->attach($perm->id);

    $admin = User::factory()->create();
    $admin->role_id = $role->id;
    $admin->company_code = 'ADMINCO';
    $admin->section_code = 'SEC2';
    $admin->save();
    \App\Models\Company::factory()->create(['company_code' => 'ADMINCO']);
    \App\Models\Section::factory()->create([
        'company_code' => 'ADMINCO',
        'section_code' => 'SEC2',
    ]);

    // two sales by different cashiers
    SalesTransaction::create([
        'cashier_id' => $admin->id,
        'invoice_no' => 'INV-ONE',
        'total_amount' => 150,
        'transaction_date' => now(),
        'status' => 'completed',
        'section_code' => 'SEC2',
        'company_code' => 'ADMINCO',
    ]);
    SalesTransaction::create([
        'cashier_id' => $admin->id + 10,
        'invoice_no' => 'INV-TWO',
        'total_amount' => 250,
        'transaction_date' => now(),
        'status' => 'completed',
        'section_code' => 'SEC2',
        'company_code' => 'ADMINCO',
    ]);

    $resp = $this->actingAs($admin)->get('/sales');
    $resp->assertOk();
    $resp->assertInertia(fn ($page) =>
        $page->component('Sales/Index')
             ->has('sales.data', 2)
    );
});
