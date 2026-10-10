<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\User;
use App\Models\DeliveryPettyCashCategory;
use App\Models\DeliveryPettyCashTransaction;

uses(DatabaseTransactions::class);

// basic checks around the delivery petty cash endpoints

test('hitting /delivery-petty-cash-categories without admin prefix redirects to admin path', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';
    $user->save();

    $this->actingAs($user)
        ->get('/delivery-petty-cash-categories')
        ->assertRedirect('/admin/delivery-petty-cash-categories');
});

test('hitting /delivery-petty-cash-transactions without admin prefix redirects to admin path', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';
    $user->save();

    $this->actingAs($user)
        ->get('/delivery-petty-cash-transactions')
        ->assertRedirect('/admin/delivery-petty-cash-transactions');
});


test('company admin can view delivery petty cash index and create a new category', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $this->actingAs($user)
        ->get('/admin/delivery-petty-cash-categories')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->component('admin/DeliveryPettyCashCategories/Index'));

    $this->actingAs($user)
        ->post('/admin/delivery-petty-cash-categories', [
            'name' => 'Fuel',
            'description' => 'Vehicle fuel costs',
        ])
        ->assertRedirect('/admin/delivery-petty-cash-categories');

    $this->assertDatabaseHas('delivery_petty_cash_categories', ['name' => 'Fuel']);
});


test('delivery petty cash transaction can be recorded and appears in table', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $category = DeliveryPettyCashCategory::create([
        'name' => 'Misc',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
    ]);

    $this->actingAs($user)
        ->post('/admin/delivery-petty-cash-transactions', [
            'type' => 'usage',
            'delivery_petty_cash_category_id' => $category->id,
            'amount' => 99.50,
            'transaction_date' => now()->toDateString(),
            'notes' => 'Test entry',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('delivery_petty_cash_transactions', [
        'type' => 'usage',
        'delivery_petty_cash_category_id' => $category->id,
        'amount' => 99.50,
    ]);
});


test('delivery petty cash ledger shows stats, cumulative balance and category breakdown', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $category = DeliveryPettyCashCategory::create([
        'name' => 'Fuel',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
    ]);

    $today = now()->toDateString();

    DeliveryPettyCashTransaction::create([
        'type' => 'received',
        'amount' => 5000,
        'transaction_date' => $today,
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
        'created_by_id' => $user->id,
    ]);

    DeliveryPettyCashTransaction::create([
        'type' => 'usage',
        'delivery_petty_cash_category_id' => $category->id,
        'amount' => 800,
        'transaction_date' => $today,
        'notes' => 'Fuel top-up 1',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
        'created_by_id' => $user->id,
    ]);

    DeliveryPettyCashTransaction::create([
        'type' => 'usage',
        'delivery_petty_cash_category_id' => $category->id,
        'amount' => 400,
        'transaction_date' => $today,
        'notes' => 'Fuel top-up 2',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
        'created_by_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->get('/admin/delivery-petty-cash-transactions')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->component('admin/DeliveryPettyCashTransactions/Index')
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


test('delivery usage transaction requires a category but reimbursement does not', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    // Usage without a category should fail
    $this->actingAs($user)
        ->post('/admin/delivery-petty-cash-transactions', [
            'type' => 'usage',
            'amount' => 500,
            'transaction_date' => now()->toDateString(),
        ])
        ->assertSessionHasErrors('delivery_petty_cash_category_id');

    // Reimbursement without a category should succeed
    $this->actingAs($user)
        ->post('/admin/delivery-petty-cash-transactions', [
            'type' => 'received',
            'amount' => 2500,
            'transaction_date' => now()->toDateString(),
            'notes' => 'Float top-up',
        ])
        ->assertRedirect('/admin/delivery-petty-cash-transactions');

    $this->assertDatabaseHas('delivery_petty_cash_transactions', [
        'type' => 'received',
        'amount' => 2500,
        'delivery_petty_cash_category_id' => null,
    ]);
});


test('company admin can edit an existing delivery petty cash category', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $category = DeliveryPettyCashCategory::create([
        'name' => 'Fuel',
        'description' => 'Vehicle fuel costs',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
    ]);

    $this->actingAs($user)
        ->get("/admin/delivery-petty-cash-categories/{$category->id}/edit")
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->component('admin/DeliveryPettyCashCategories/Edit')
            ->has('category')
            ->where('category.name', 'Fuel')
        );

    $this->actingAs($user)
        ->put("/admin/delivery-petty-cash-categories/{$category->id}", [
            'name' => 'Fuel & Transport',
            'description' => 'Updated description',
            'status' => 'inactive',
        ])
        ->assertRedirect('/admin/delivery-petty-cash-categories');

    $this->assertDatabaseHas('delivery_petty_cash_categories', [
        'id' => $category->id,
        'name' => 'Fuel & Transport',
        'description' => 'Updated description',
        'status' => 'inactive',
    ]);
});


test('company admin can toggle and delete a delivery petty cash category', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $category = DeliveryPettyCashCategory::create([
        'name' => 'Utilities',
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
    ]);

    $this->actingAs($user)
        ->patch("/admin/delivery-petty-cash-categories/{$category->id}/toggle-status")
        ->assertRedirect();

    $this->assertDatabaseHas('delivery_petty_cash_categories', [
        'id' => $category->id,
        'status' => 'inactive',
    ]);

    $this->actingAs($user)
        ->delete("/admin/delivery-petty-cash-categories/{$category->id}")
        ->assertRedirect();

    $this->assertDatabaseMissing('delivery_petty_cash_categories', ['id' => $category->id]);
});


test('delivery petty cash transaction can be deleted', function () {
    $user = User::factory()->create();
    $user->user_type = 'company_user';
    $user->company_code = 'TEST';
    $user->section_code = 'S1';

    $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
    $user->role_id = $role->id;
    $user->save();

    $tx = DeliveryPettyCashTransaction::create([
        'type' => 'received',
        'amount' => 1000,
        'transaction_date' => now()->toDateString(),
        'company_code' => $user->company_code,
        'section_code' => $user->section_code,
        'created_by_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->delete("/admin/delivery-petty-cash-transactions/{$tx->id}")
        ->assertRedirect();

    $this->assertDatabaseMissing('delivery_petty_cash_transactions', ['id' => $tx->id]);
});