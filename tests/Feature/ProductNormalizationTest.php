<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use App\Models\Product;
use App\Models\ItemPriceDet;
use App\Models\Section;
use App\Models\Brand;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProductNormalizationTest extends TestCase
{
    use DatabaseTransactions;

    protected $user;
    protected $company;
    protected $section;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::create([
            'company_code' => 'NORMTEST',
            'name' => 'Normalization Test Co',
            'address' => '123 Test St',
            'phone' => '0000000000',
            'email' => 'norm@example.com',
            'password' => bcrypt('pw'),
            'is_active' => true,
        ]);

        $permCreate = Permission::firstOrCreate(['slug' => 'products.create'], ['name' => 'Create Products', 'uuid' => (string) \Illuminate\Support\Str::uuid()]);
        $permView = Permission::firstOrCreate(['slug' => 'products.view'], ['name' => 'View Products', 'uuid' => (string) \Illuminate\Support\Str::uuid()]);

        $role = Role::create([
            'name' => 'NormAdmin',
            'slug' => 'norm-admin',
            'level' => 'user',
            'company_code' => $this->company->company_code,
        ]);
        $role->permissions()->attach([$permCreate->id, $permView->id]);

        $this->section = Section::create([
            'company_code' => $this->company->company_code,
            'section_code' => 'NORMSEC',
            'name' => 'Norm Section',
            'is_active' => true,
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
        ]);

        $this->user = User::create([
            'company_code' => $this->company->company_code,
            'first_name' => 'Norm',
            'last_name' => 'Tester',
            'email' => 'normtester@example.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
            'section_code' => $this->section->section_code,
            'is_active' => true,
        ]);

        $this->actingAs($this->user);

        // Create ControlMaster
        \App\Models\ControlMaster::create([
            'conkey' => 'CON1',
            'concode' => 'CODE1',
            'conname' => 'Control 1',
            'company_code' => $this->company->company_code,
            'is_active' => true,
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
        ]);

        // Create Category
        \App\Models\CodeMaster::create([
            'conkey' => 'CON1',
            'concode' => 'CODE1',
            'catkey' => 'CAT1',
            'cname' => 'Category 1',
            'company_code' => $this->company->company_code,
            'is_active' => true,
        ]);

        // Create Unit
        $this->unit = \App\Models\CodeMaster::create([
            'conkey' => 'CON1',
            'concode' => 'CODE1',
            'catkey' => 'UNIT',
            'cname' => 'Pieces',
            'company_code' => $this->company->company_code,
            'is_active' => true,
        ]);
    }

    public function test_product_creation_follows_normalization_rules()
    {
        $brand = Brand::create([
            'name' => 'Test Brand',
            'code' => 'BR-001',
            'company_code' => $this->company->company_code
        ]);

        $model = \App\Models\ProductModel::create([
            'name' => 'Model-X',
            'code' => 'MX-001',
            'brand_id' => $brand->id,
            'company_code' => $this->company->company_code
        ]);

        $productData = [
            'ItemCode' => 'NORM-ITEM-001',
            'ItmNm' => 'Normalized Item',
            'BarCode' => 'BAR-001',
            'brand_id' => $brand->id,
            'models_id' => $model->id,
            'serial_number' => 'SN-123456',
            'warranty' => '2 Years',
            'CosPri' => 1000,
            'SlsPri' => 1500,
            'WholePrice' => 1200,
            'batch_no' => 'BATCH-001',
            'catkey' => 'CAT1',
            'UnitKy' => $this->unit->id,
            'available_sections' => [$this->section->section_code],
        ];

        $response = $this->post('/pos/products', $productData);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        // 1. Check itemmaster
        $product = Product::where('ItemCode', 'NORM-ITEM-001')->first();
        $this->assertNotNull($product);
        $this->assertEquals('BAR-001', $product->BarCode);
        $this->assertEquals($brand->id, $product->brand_id);
        $this->assertEquals($model->id, $product->models_id);
        $this->assertEquals('SN-123456', $product->serial_number);

        // 2. Check item_price_det
        $priceDet = ItemPriceDet::where('ItmKy', $product->ItmKy)->first();
        $this->assertNotNull($priceDet);
        
        // These SHOULD exist in item_price_det
        $this->assertEquals('SN-123456', $priceDet->serial_number);
        $this->assertEquals('2 Years', $priceDet->warranty);
        $this->assertEquals(1000, (float)$priceDet->CosPri);
        $this->assertEquals(1500, (float)$priceDet->SlsPri);

        // These SHOULD NOT exist in item_price_det table (they were removed)
        $this->assertFalse(Schema::hasColumn('item_price_det', 'brand'), 'brand column should not exist in item_price_det');
        $this->assertFalse(Schema::hasColumn('item_price_det', 'model'), 'model column should not exist in item_price_det');
        $this->assertFalse(Schema::hasColumn('item_price_det', 'ItemCode'), 'ItemCode column should not exist in item_price_det');
        $this->assertFalse(Schema::hasColumn('item_price_det', 'BarCode'), 'BarCode column should not exist in item_price_det');
    }
}
