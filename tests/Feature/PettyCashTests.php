<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\User;
use App\Models\PettyCashCategory;
use App\Models\PettyCashTransaction;

uses(DatabaseTransactions::class);

// basic checks around the petty cash endpoints

// ensure non-admin URLs redirect users into the admin prefix

test('hitting /petty-cash-categories without admin prefix redirects to admin path', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';
    $user->save();

    $this->actingAs($user)
        ->get('/petty-cash-categories')
        ->assertRedirect('/admin/petty-cash-categories');
});

test('hitting /petty-cash-transactions without admin prefix redirects to admin path', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';
    $user->save();

    $this->actingAs($user)
        ->get('/petty-cash-transactions')
        ->assertRedirect('/admin/petty-cash-transactions');
});


test('company admin can view petty cash index and create a new category', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $this->actingAs($user)
        ->get('/admin/petty-cash-categories')
        ->assertStatus(200);

    $this->actingAs($user)
        ->post('/admin/petty-cash-categories', [
            'name' => 'Fuel',
            'description' => 'Vehicle fuel costs',
        ])
        ->assertRedirect('/admin/petty-cash-categories');

    $this->assertDatabaseHas('petty_cash_categories', ['name' => 'Fuel']);
});


test('petty cash transaction can be recorded and appears in table', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $category = PettyCashCategory::create([
        'name' => 'Misc',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
    ]);

    $this->actingAs($user)
        ->post('/admin/petty-cash-transactions', [
            'type' => 'usage',
            'category_id' => $category->id,
            'amount' => 99.50,
            'transaction_date' => now()->toDateString(),
            'notes' => 'Test entry',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('petty_cash_transactions', [
        'type' => 'usage',
        'category_id' => $category->id,
        'amount' => 99.50,
    ]);
});


test('petty cash ledger shows stats, cumulative balance and category breakdown', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $category = PettyCashCategory::create([
        'name' => 'Fuel',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
    ]);

    $today = now()->toDateString();

    PettyCashTransaction::create([
        'type' => 'received',
        'amount' => 5000,
        'transaction_date' => $today,
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
        'created_by_id' => $user->id,
    ]);

    PettyCashTransaction::create([
        'type' => 'usage',
        'category_id' => $category->id,
        'amount' => 800,
        'transaction_date' => $today,
        'notes' => 'Fuel top-up 1',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
        'created_by_id' => $user->id,
    ]);

    PettyCashTransaction::create([
        'type' => 'usage',
        'category_id' => $category->id,
        'amount' => 400,
        'transaction_date' => $today,
        'notes' => 'Fuel top-up 2',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
        'created_by_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->get('/admin/petty-cash-transactions')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->component('admin/PettyCashTransactions/Index')
            ->where('stats.cash_received', 5000)
            ->where('stats.total_usage', 1200)
            ->where('stats.received_count', 1)
            ->where('stats.usage_count', 2)
            ->where('stats.available_balance', 3800)
            ->has('transactions', 3)
            ->has('by_category', 1)
            ->where('by_category.0.category_name', 'Fuel')
            ->where('by_category.0.total', 1200)
            ->where('transactions.0.type', 'usage')
            ->where('transactions.0.balance', 3800)
        );
});


test('usage transaction requires a category but reimbursement does not', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    // Usage without a category should fail
    $this->actingAs($user)
        ->post('/admin/petty-cash-transactions', [
            'type' => 'usage',
            'amount' => 500,
            'transaction_date' => now()->toDateString(),
        ])
        ->assertSessionHasErrors('category_id');

    // Reimbursement without a category should succeed
    $this->actingAs($user)
        ->post('/admin/petty-cash-transactions', [
            'type' => 'received',
            'amount' => 2500,
            'transaction_date' => now()->toDateString(),
            'notes' => 'Float top-up',
        ])
        ->assertRedirect('/admin/petty-cash-transactions');

    $this->assertDatabaseHas('petty_cash_transactions', [
        'type' => 'received',
        'amount' => 2500,
        'category_id' => null,
    ]);
});


test('company admin can edit an existing petty cash category', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $category = PettyCashCategory::create([
        'name' => 'Fuel',
        'description' => 'Vehicle fuel costs',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
    ]);

    $this->actingAs($user)
        ->get("/admin/petty-cash-categories/{$category->id}/edit")
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->component('admin/PettyCashCategories/Edit')
            ->has('category')
            ->where('category.name', 'Fuel')
        );

    $this->actingAs($user)
        ->put("/admin/petty-cash-categories/{$category->id}", [
            'name' => 'Fuel & Transport',
            'description' => 'Updated description',
            'status' => 'inactive',
        ])
        ->assertRedirect('/admin/petty-cash-categories');

    $this->assertDatabaseHas('petty_cash_categories', [
        'id' => $category->id,
        'name' => 'Fuel & Transport',
        'description' => 'Updated description',
        'status' => 'inactive',
    ]);
});


test('company admin can toggle and delete a petty cash category', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $category = PettyCashCategory::create([
        'name' => 'Utilities',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
    ]);

    $this->actingAs($user)
        ->patch("/admin/petty-cash-categories/{$category->id}/toggle-status")
        ->assertRedirect();

    $this->assertDatabaseHas('petty_cash_categories', [
        'id' => $category->id,
        'status' => 'inactive',
    ]);

    $this->actingAs($user)
        ->delete("/admin/petty-cash-categories/{$category->id}")
        ->assertRedirect();

    $this->assertDatabaseMissing('petty_cash_categories', ['id' => $category->id]);
});


test('petty cash analysis report returns category breakdown and export', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $category = PettyCashCategory::create([
        'name' => 'Fuel',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
    ]);

    PettyCashTransaction::create([
        'category_id' => $category->id,
        'amount' => 100,
        'transaction_date' => now()->toDateString(),
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
        'created_by_id' => $user->id,
    ]);
    PettyCashTransaction::create([
        'category_id' => $category->id,
        'amount' => 50,
        'transaction_date' => now()->toDateString(),
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
        'created_by_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->get('/reports/petty-cash-analysis')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->component('Reports/PettyCashAnalysis')
            ->has('summary', fn ($s) => $s->where('total_outflow', 150)->etc())
            ->has('by_category', 1)
        );

    $this->actingAs($user)
        ->get('/reports/petty-cash-analysis/export')
        ->assertStatus(200)
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');
});