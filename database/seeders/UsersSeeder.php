<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Section;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Get company-specific Roles (used instead of global roles so that
        //    Vismass and Malibu cashiers can have independent permission sets)
        $visCompanyAdminRole   = Role::where('slug', 'vis001_company_admin')->first()
                               ?? Role::where('slug', 'company_admin')->first();
        $visTechnicianRole     = Role::where('slug', 'vis001_technician')->first()
                               ?? Role::where('slug', 'technician')->first();
        $visCashierRole        = Role::where('slug', 'vis001_cashier')->first()
                               ?? Role::where('slug', 'cashier')->first();
        $visSalesRepRole       = Role::where('slug', 'vis001_sales_rep')->first()
                               ?? Role::where('slug', 'sales_rep')->first();

        $malCompanyAdminRole   = Role::where('slug', 'mal001_company_admin')->first()
                               ?? Role::where('slug', 'company_admin')->first();
        $malCashierRole        = Role::where('slug', 'mal001_cashier')->first()
                               ?? Role::where('slug', 'cashier')->first();
        $malSalesRepRole       = Role::where('slug', 'mal001_sales_rep')->first()
                               ?? Role::where('slug', 'sales_rep')->first();

        // 2. Define Companies and Sections
        // Vismass Sections
        $visServiceSection = Section::where('section_code', 'VIS-SEC-001')->first();
        $visImportSection = Section::where('section_code', 'VIS-SEC-002')->first();
        $visMainStockSection = Section::where('section_code', 'VIS-SEC-003')->first();

        // Malibu Sections
        $malDeliverySection = Section::where('section_code', 'MAL-SEC-001')->first();
        $malPrintingSection = Section::where('section_code', 'MAL-SEC-002')->first();

        // --- VISMASS (VIS001) COMPANY ADMIN ---
        if ($visCompanyAdminRole) {
            User::firstOrCreate(
                ['email' => 'vismass@example.com'],
                [
                    'username' => 'vismass_admin',
                    'password' => Hash::make('password'),
                    'first_name' => 'Vismass',
                    'last_name' => 'Admin',
                    'user_type' => 'company_admin',
                    'role_id' => $visCompanyAdminRole->id,
                    'company_code' => 'VIS001',
                    'section_code' => 'VIS-SEC-002',
                    'is_active' => true,
                    'is_verified' => true,
                    'email_verified_at' => now(),
                    'uuid' => (string) Str::uuid(),
                ]
            );
        }

        // --- VISMASS SECTION USERS ---

        // Technicians (Assigned to Service Section)
        if ($visTechnicianRole && $visServiceSection) {
            // Create 2 technicians for Vismass
            for ($i = 1; $i <= 2; $i++) {
                User::firstOrCreate(
                    ['email' => "tech{$i}.vismass@example.com"],
                    [
                        'username' => "vismass_tech_{$i}",
                        'password' => Hash::make('password'),
                        'first_name' => 'Vismass',
                        'last_name' => "Technician {$i}",
                        'user_type' => 'company_user',
                        'role_id' => $visTechnicianRole->id,
                        'company_code' => 'VIS001',
                        'section_code' => $visServiceSection->section_code,
                        'is_active' => true,
                        'is_verified' => true,
                        'email_verified_at' => now(),
                        'uuid' => (string) Str::uuid(),
                    ]
                );
            }
        }

        // Cashiers (Assigned to Import Section)
        if ($visCashierRole && $visImportSection) {
            // Create 2 cashiers for Vismass
            for ($i = 1; $i <= 2; $i++) {
                User::firstOrCreate(
                    ['email' => "cashier{$i}.vismass@example.com"],
                    [
                        'username' => "vismass_cashier_{$i}",
                        'password' => Hash::make('password'),
                        'first_name' => 'Vismass',
                        'last_name' => "Cashier {$i}",
                        'user_type' => 'company_user',
                        'role_id' => $visCashierRole->id,
                        'company_code' => 'VIS001',
                        'section_code' => $visImportSection->section_code,
                        'is_active' => true,
                        'is_verified' => true,
                        'email_verified_at' => now(),
                        'uuid' => (string) Str::uuid(),
                    ]
                );
            }
        }

        // Sales Reps (Assigned to Main Stock)
        if ($visSalesRepRole && $visMainStockSection) {
            User::firstOrCreate(
                ['email' => 'sales1.vismass@example.com'],
                [
                    'username' => 'vismass_sales_1',
                    'password' => Hash::make('password'),
                    'first_name' => 'Vismass',
                    'last_name' => 'Sales Rep 1',
                    'user_type' => 'company_user',
                    'role_id' => $visSalesRepRole->id,
                    'company_code' => 'VIS001',
                    'section_code' => $visMainStockSection->section_code,
                    'is_active' => true,
                    'is_verified' => true,
                    'email_verified_at' => now(),
                    'uuid' => (string) Str::uuid(),
                ]
            );
        }

         // --- MALIBU (MAL001) COMPANY ADMIN ---
        if ($malCompanyAdminRole) {
            User::firstOrCreate(
                ['email' => 'malibu@example.com'],
                [
                    'username' => 'malibu_admin',
                    'password' => Hash::make('password'),
                    'first_name' => 'Malibu',
                    'last_name' => 'Admin',
                    'user_type' => 'company_admin',
                    'role_id' => $malCompanyAdminRole->id,
                    'company_code' => 'MAL001',
                    'section_code' => 'MAL-SEC-002',
                    'is_active' => true,
                    'is_verified' => true,
                    'email_verified_at' => now(),
                    'uuid' => (string) Str::uuid(),
                ]
            );
        }

        // --- MALIBU SECTION USERS ---

        // Sales Representative (Assigned to Delivery Section)
        if ($malSalesRepRole && $malDeliverySection) {
            User::firstOrCreate(
                ['email' => 'salesrep.malibu@example.com'],
                [
                    'username' => 'malibu_sales_rep',
                    'password' => Hash::make('password'),
                    'first_name' => 'Malibu',
                    'last_name' => 'Sales Rep',
                    'user_type' => 'company_user',
                    'role_id' => $malSalesRepRole->id,
                    'company_code' => 'MAL001',
                    'section_code' => $malDeliverySection->section_code,
                    'is_active' => true,
                    'is_verified' => true,
                    'email_verified_at' => now(),
                    'uuid' => (string) Str::uuid(),
                ]
            );
        }

        // Cashiers (Assigned to Printing Section)
        if ($malCashierRole && $malPrintingSection) {
             // Create 2 cashiers for Malibu
             for ($i = 1; $i <= 2; $i++) {
                User::firstOrCreate(
                    ['email' => "cashier{$i}.malibu@example.com"],
                    [
                        'username' => "malibu_cashier_{$i}",
                        'password' => Hash::make('password'),
                        'first_name' => 'Malibu',
                        'last_name' => "Cashier {$i}",
                        'user_type' => 'company_user',
                        'role_id' => $malCashierRole->id,
                        'company_code' => 'MAL001',
                        'section_code' => $malPrintingSection->section_code,
                        'is_active' => true,
                        'is_verified' => true,
                        'email_verified_at' => now(),
                        'uuid' => (string) Str::uuid(),
                    ]
                );
            }
        }
    }
}
