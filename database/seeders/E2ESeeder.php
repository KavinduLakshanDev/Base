<?php

namespace Database\Seeders;

use App\Models\DeliveryRoute;
use App\Models\Product;
use App\Models\StockInHand;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class E2ESeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure baseline seeders are present
        $this->call([\Database\Seeders\RoleSeeder::class, \Database\Seeders\PermissionSeeder::class, \Database\Seeders\CompanySeeder::class, \Database\Seeders\SectionSeeder::class]);

        // Create an admin user for E2E runs (company-scoped to VISMASS)
        User::firstOrCreate(
            ['email' => 'e2e_admin@example.com'],
            [
                'username' => 'e2e_admin',
                'first_name' => 'E2E',
                'last_name' => 'Admin',
                'password' => 'password',
                'user_type' => 'super_admin',
                'company_code' => 'VIS001',
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
            ]
        );

        // Create a sales-rep user
        $salesRep = User::firstOrCreate(
            ['email' => 'e2e_rep@example.com'],
            [
                'username' => 'e2e_rep',
                'first_name' => 'E2E',
                'last_name' => 'Rep',
                'password' => 'password',
                'user_type' => 'company_user',
                'company_code' => 'VIS001',
                'is_active' => true,
            ]
        );

        // Create a simple product and stock record in the VISMASS main section
        $product = Product::firstOrCreate(
            ['ItmKy' => 'E2E-001', 'company_code' => 'VIS001'],
            [
                'ItmNm' => 'E2E Product 1',
                'ItemCode' => 'E2EPRD1',
                'section_code' => 'VIS-SEC-003',
                'fInAct' => false,
                'CosPri' => 10.00,
                'SlsPri' => 15.00,
            ]
        );

        // Add stock (purchase) so batches are available for vehicle loading / delivery
        StockInHand::firstOrCreate(
            [
                'RefNo' => 'E2E-STOCK-IN-1',
                'ItemKy' => $product->ItmKy,
                'batch_no' => 'E2E-BATCH',
                'company_code' => 'VIS001',
            ],
            [
                'OrdDate' => now()->toDateString(),
                'Qty' => 100,
                'FreeQty' => 0,
                'TrnTyp' => 'PURCHASE',
                'owner_company_code' => 'VIS001',
                'section_code' => 'VIS-SEC-003',
                'serial_number' => null,
                'brand' => 'E2E Brand',
                'model' => 'E2E Model',
            ]
        );

        // Create a dedicated printer product with distinct retail/wholesale prices
        $printerProduct = Product::firstOrCreate(
            ['ItmKy' => 'E2E-PRT-1', 'company_code' => 'VIS001'],
            [
                'ItmNm' => 'E2E Printer',
                'ItemCode' => 'E2EPRT1',
                'section_code' => 'VIS-SEC-003',
                'fInAct' => false,
                'CosPri' => 500.00,
                'SlsPri' => 1000.00, // retail price
                'WholePrice' => 900.00, // wholesale price
                'ExtraPrice' => 1200.00,
            ]
        );

        // Add stock for printer with a serial number so search will find it
        StockInHand::firstOrCreate(
            [
                'RefNo' => 'E2E-PRINTER-STOCK-1',
                'ItemKy' => $printerProduct->ItmKy,
                'batch_no' => 'E2E-PRT-BATCH',
                'company_code' => 'VIS001',
                'serial_number' => 'PRT-001'
            ],
            [
                'OrdDate' => now()->toDateString(),
                'Qty' => 1,
                'FreeQty' => 0,
                'TrnTyp' => 'PURCHASE',
                'owner_company_code' => 'VIS001',
                'section_code' => 'VIS-SEC-003',
                'brand' => 'E2E Brand',
                'model' => 'E2E Model',
            ]
        );

        // Create an active delivery route for the company and attach the test sales-rep + a shop
        $route = DeliveryRoute::firstOrCreate(
            ['company_code' => 'VIS001', 'name' => 'E2E Route'],
            ['is_active' => true]
        );

        // Attach the sales rep to the route so route-aware UI filters behave in E2E
        $route->users()->syncWithoutDetaching([$salesRep->id]);

        // Create a shop and attach it to the route
        $shop = \App\Models\Shop::firstOrCreate(
            ['company_code' => 'VIS001', 'name' => 'E2E Shop 1'],
            [
                'address' => '1 E2E Lane',
                'contact_phone' => '+9411123000',
                'is_active' => true,
            ]
        );
        $route->shops()->syncWithoutDetaching([$shop->id]);
    }
}
