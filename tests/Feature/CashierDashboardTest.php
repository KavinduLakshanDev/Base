<?php

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionItem;
use App\Models\ServiceJob;
use App\Models\ItemMaster;
use App\Models\StockInHand;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('cashier sees dashboard stats', function () {
    // 1. Setup Permissions
    $role = Role::firstOrCreate(['slug' => 'cashier'], ['name' => 'Cashier', 'level' => 'section_user', 'guard_name' => 'web']);
    $permission = Permission::firstOrCreate(['slug' => 'sales.view'], ['name' => 'sales.view', 'uuid' => (string) \Illuminate\Support\Str::uuid(), 'guard_name' => 'web']);
    $role->permissions()->syncWithoutDetaching([$permission->id]);
    
    $user = User::factory()->create([
        'company_code' => 'TEST',
        'section_code' => 'MAIN',
    ]);
    $user->role_id = $role->id;
    $user->save();

    // 2. Setup Data
    // Ensure cashier has an opening balance for today so middleware allows access
    \App\Models\DayOpeningBalance::create([
        'user_id' => $user->id,
        'balance_date' => now()->toDateString(),
        'opening_balance' => 1000,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
        'created_by' => $user->id,
    ]);

    // Sales: one belonging to this cashier, one belonging to someone else
    SalesTransaction::create([
        'cashier_id' => $user->id,
        'invoice_no' => 'INV-1',
        'total_amount' => 1000,
        'transaction_date' => now(),
        'status' => 'completed',
        'payment_details' => ['mode' => 'cash']
    ]);
    
    SalesTransaction::create([
        'cashier_id' => $user->id + 1, // different id
        'invoice_no' => 'INV-2',
        'total_amount' => 2000,
        'transaction_date' => now(),
        'status' => 'completed',
        'payment_details' => ['mode' => 'card']
    ]);


    // Low Stock Item (manual creation without factory)
    // include company/section codes to satisfy NOT NULL constraints
    $item = ItemMaster::create([
        'ItmKy' => 'ITEM-001',
        'Status' => 'A', 
        'ReOrdlLvl' => 10,
        'ItmNm' => 'Test Item',
        'ItemCode' => 'ITEM-001',
        'company_code' => 'VIS001',
        'section_code' => 'MAIN',
    ]);
    StockInHand::create([
        'ItemKy' => $item->ItmKy,
        'Qty' => 5,
        'section_code' => 'MAIN', 
        'owner_company_code' => 'VIS001', // Add owner for test
        'TrnTyp' => 'GRN',
        'OrdDate' => now()
    ]);

    // 3. Act
    $response = $this->actingAs($user)->get(route('dashboard'));

    // 4. Assert – cashier should only see their own first sale
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('stats', fn ($stats) => $stats
            ->where('todays_sales.total', '1000.00')
            ->where('todays_sales.count', 1)
            ->where('todays_sales.cash', '1000.00')
            ->where('todays_sales.card', 0)
            ->has('low_stock_items', 1)
            ->where('low_stock_items.0.item_code', 'ITEM-001')
            ->etc()
        )
    );
});

// admin user should see all transactions for the section
test('company admin sees full stats', function () {
    $role = Role::firstOrCreate(['slug' => 'company_admin'], ['name' => 'Company Admin', 'level' => 'company_admin', 'guard_name' => 'web']);
    $permission = Permission::firstOrCreate(['slug' => 'dashboard.view'], ['name' => 'dashboard.view', 'uuid' => (string) \Illuminate\Support\Str::uuid(), 'guard_name' => 'web']);
    $role->permissions()->syncWithoutDetaching([$permission->id]);

    $admin = User::factory()->create();
    $admin->role_id = $role->id;
    $admin->save();

    // create two sales by different cashiers
    SalesTransaction::create([
        'cashier_id' => $admin->id,
        'invoice_no' => 'INV-3',
        'total_amount' => 500,
        'transaction_date' => now(),
        'status' => 'completed',
        'payment_details' => ['mode' => 'cash']
    ]);
    SalesTransaction::create([
        'cashier_id' => $admin->id + 5,
        'invoice_no' => 'INV-4',
        'total_amount' => 1500,
        'transaction_date' => now(),
        'status' => 'completed',
        'payment_details' => ['mode' => 'card']
    ]);

    $resp = $this->actingAs($admin)->get(route('dashboard'));
    $resp->assertOk();
    $resp->assertInertia(fn ($page) => $page
        ->component('dashboard')
        // allow additional stat properties such as ready_for_collection etc
        ->has('stats', fn ($stats) =>
            $stats->where('todays_sales.total', '2000.00')
                  ->where('todays_sales.count', 2)
                  ->etc()
        )
    );
});

