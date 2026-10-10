<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    // set up a company, role, permissions and user same as other product tests
    $company = Company::create([
        'company_code' => 'TESTSHOW',
        'name' => 'Test Show Co',
        'address' => '123 Test Lane',
        'phone' => '0000000000',
        'email' => 'show@example.com',
        'password' => bcrypt('pw'),
        'is_active' => true,
    ]);

    $permView = Permission::firstOrCreate([
        'slug' => 'products.view'
    ], [
        'name' => 'View Products',
        'description' => 'Can view products',
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
    ]);

    $role = Role::create([
        'name' => 'ProductViewer',
        'slug' => 'product-viewer',
        'level' => 'user',
        'company_code' => $company->company_code,
    ]);
    $role->permissions()->attach([$permView->id]);

    $section = \App\Models\Section::factory()->create([
        'company_code' => $company->company_code,
        'section_code' => 'SEC1',
        'name' => 'Default Section',
        'is_active' => true,
    ]);

    $this->user = User::create([
        'company_code' => $company->company_code,
        'first_name' => 'Viewer',
        'last_name' => 'User',
        'email' => 'viewer@example.com',
        'password' => bcrypt('password'),
        'role_id' => $role->id,
        'section_code' => $section->section_code,
        'is_active' => true,
    ]);

    $this->actingAs($this->user);
});

it('returns categories and units and shows extra product details', function () {
    // temporarily drop FK constraints to allow simple code_master inserts
    \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0');

    // create matching category and unit records so lookup works
    \Illuminate\Support\Facades\DB::table('code_masters')->insert([
        ['conkey' => 'CAT', 'concode' => 'C1', 'catkey' => 'C1', 'cname' => 'Category 1', 'company_code' => $this->user->company_code, 'is_active' => true, 'uuid' => (string) \Illuminate\Support\Str::uuid()],
        ['conkey' => 'UNT', 'concode' => '99', 'id' => 99, 'cname' => 'Unit99', 'company_code' => $this->user->company_code, 'is_active' => true, 'uuid' => (string) \Illuminate\Support\Str::uuid()],
    ]);

    \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1');

    // create a brand and assign by id so the show page can display its name
    $brand = \App\Models\Brand::create([
        'code' => 'BR001',
        'name' => 'BrandX',
        'company_code' => $this->user->company_code,
        'is_active' => true,
    ]);

    $product = Product::create([
        'ItemCode' => 'SHOW1',
        'ItmNm' => 'Show Item',
        'company_code' => $this->user->company_code,
        'section_code' => $this->user->section_code,
        'catkey' => 'C1',
        'UnitKy' => 99,
        'batch_no' => 'BATCHX',
        'brand_id' => $brand->id,
        'model' => 'ModelY',
        'serial_number' => 'SN123',
        'warranty' => '1 year',
        'available_business_units' => ['malibo'],
    ]);

    $response = $this->get("/pos/products/{$product->ItmKy}");
    $response->assertStatus(200);
    $response->assertInertia(fn($page) =>
        $page
            ->component('pos/products/show')
            ->has('categories')
            ->has('units')
            ->where('item.ItemCode', 'SHOW1')
            ->where('item.batch_no', 'BATCHX')
            ->where('item.brand.name', 'BrandX')
    );
});
