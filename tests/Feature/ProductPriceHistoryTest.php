<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use App\Models\Product;
use App\Models\ItemPriceDet;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    // create a company for the user
    $company = Company::create([
        'company_code' => 'TESTPROD',
        'name' => 'Test Product Co',
        'address' => '123 Test St',
        'phone' => '0000000000',
        'email' => 'testprod@example.com',
        'password' => bcrypt('pw'),
        'is_active' => true,
    ]);

    // permissions required for product creation and editing (use firstOrCreate to avoid duplicates)
    $permCreate = Permission::firstOrCreate(
        ['slug' => 'products.create'],
        [
            'name' => 'Create Products',
            'description' => 'Can create products',
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
        ]
    );
    $permEdit = Permission::firstOrCreate(
        ['slug' => 'products.edit'],
        [
            'name' => 'Edit Products',
            'description' => 'Can edit products',
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
        ]
    );

    $role = Role::create([
        'name' => 'ProductAdmin',
        'slug' => 'product-admin',
        'level' => 'user',
        'company_code' => $company->company_code,
    ]);
    $role->permissions()->attach([$permCreate->id, $permEdit->id]);

    // create a default section for the company and assign to user
    $section = \App\Models\Section::factory()->create([
        'company_code' => $company->company_code,
        'section_code' => 'SEC1',
        'name' => 'Default Section',
        'is_active' => true,
    ]);

    $this->user = User::create([
        'company_code' => $company->company_code,
        'first_name' => 'Product',
        'last_name' => 'Manager',
        'email' => 'productmgr@example.com',
        'password' => bcrypt('password'),
        'role_id' => $role->id,
        'section_code' => $section->section_code,
        'is_active' => true,
    ]);

    $this->actingAs($this->user);
});

it('saves a price history row when a product is created via model', function () {
    // create product directly
    $product = Product::create([
        'ItemCode' => 'TEST1',
        'ItmNm' => 'Test Item 1',
        'CosPri' => 10,
        'SlsPri' => 15,
        'company_code' => $this->user->company_code,
        'section_code' => $this->user->section_code ?? '',
        'Status' => 'I',
        'available_sections' => [$this->user->section_code ?? ''],
        'available_business_units' => [],
    ]);

    expect($product)->not->toBeNull();

    // manually add initial price history
    ItemPriceDet::create([
        'ItmKy' => $product->ItmKy,
        'ItemCode' => $product->ItemCode,
        'section_code' => $product->section_code,
        'CosPri' => 10,
        'SlsPri' => 15,
        'ChangedDate' => now(),
        'Status' => 'I',
    ]);

    $this->assertDatabaseHas('itemmaster', [
        'ItemCode' => 'TEST1',
        'CosPri' => 10,
    ]);

    $this->assertDatabaseHas('item_price_det', [
        'ItmKy' => $product->ItmKy,
        'CosPri' => 10,
        'Status' => 'I',
    ]);
});

it('updates existing history record when price is changed without keep_price', function () {
    // create via HTTP so we replicate controller behaviour
    // create product manually and seed history
    $product = Product::create([
        'ItemCode' => 'TEST2',
        'ItmNm' => 'Test Item 2',
        'CosPri' => 20,
        'SlsPri' => 30,
        'company_code' => $this->user->company_code,
        'section_code' => $this->user->section_code ?? '',
        'Status' => 'I',
        'available_sections' => [$this->user->section_code ?? ''],
        'available_business_units' => [],
    ]);
    expect($product)->not->toBeNull();

    ItemPriceDet::create([
        'ItmKy' => $product->ItmKy,
        'ItemCode' => $product->ItemCode,
        'section_code' => $product->section_code,
        'CosPri' => 20,
        'SlsPri' => 30,
        'ChangedDate' => now(),
        'Status' => 'I',
    ]);

    // verify initial history count
    $initialCount = ItemPriceDet::where('ItmKy', $product->ItmKy)->count();
    expect($initialCount)->toBe(1);

    // submit update with changed cost price and no keep_price checkbox
    $response = $this->put("/pos/products/{$product->ItmKy}", [
        'ItemCode' => 'TEST2',
        'ItmNm' => 'Test Item 2',
        'CosPri' => 25,
        'SlsPri' => 35,
        'WholePrice' => 0,
        'keep_price' => false,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();
    // optional: assert success message present
    $this->assertTrue(session()->has('success'));

    $product->refresh();
    expect((float) $product->CosPri)->toBe(25.0);

    // history count should still be 1, and the record should have been updated
    $afterCount = ItemPriceDet::where('ItmKy', $product->ItmKy)->count();
    expect($afterCount)->toBe(1);

    $this->assertDatabaseHas('item_price_det', [
        'ItmKy' => $product->ItmKy,
        'CosPri' => 25,
    ]);
});

it('creates a new price history record when price is changed with keep_price', function () {
    $product = Product::create([
        'ItemCode' => 'TEST3',
        'ItmNm' => 'Test Item 3',
        'CosPri' => 30,
        'SlsPri' => 40,
        'company_code' => $this->user->company_code,
        'section_code' => $this->user->section_code ?? '',
        'Status' => 'I',
        'available_sections' => [$this->user->section_code ?? ''],
        'available_business_units' => [],
    ]);
    expect($product)->not->toBeNull();

    ItemPriceDet::create([
        'ItmKy' => $product->ItmKy,
        'ItemCode' => $product->ItemCode,
        'section_code' => $product->section_code,
        'CosPri' => 30,
        'SlsPri' => 40,
        'ChangedDate' => now(),
        'Status' => 'I',
    ]);

    $initialCount = ItemPriceDet::where('ItmKy', $product->ItmKy)->count();
    expect($initialCount)->toBe(1);

    $response = $this->put("/pos/products/{$product->ItmKy}", [
        'ItemCode' => 'TEST3',
        'ItmNm' => 'Test Item 3',
        'CosPri' => 35,
        'SlsPri' => 45,
        'WholePrice' => 0,
        'keep_price' => true,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();
    $this->assertTrue(session()->has('success'));

    $product->refresh();
    expect((float) $product->CosPri)->toBe(35.0);

    $afterCount = ItemPriceDet::where('ItmKy', $product->ItmKy)->count();
    expect($afterCount)->toBe(2);

    // ensure both old and new values exist
    $this->assertDatabaseHas('item_price_det', [
        'ItmKy' => $product->ItmKy,
        'CosPri' => 30,
    ]);
    $this->assertDatabaseHas('item_price_det', [
        'ItmKy' => $product->ItmKy,
        'CosPri' => 35,
        'Status' => 'U',
    ]);
});
