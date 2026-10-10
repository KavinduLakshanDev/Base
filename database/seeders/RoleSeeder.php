<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ─── Global / system roles ────────────────────────────────────────────
        // These exist for super_admin and as fallback defaults.
        Role::firstOrCreate(
            ['slug' => 'super_admin'],
            [
                'name' => 'Super Admin',
                'description' => 'Has full access to the entire system',
                'level' => 'super_admin',
                'company_code' => null,
            ]
        );

        // ─── Vismass (VIS001) company-specific roles ─────────────────────────
        // Permissions are assigned independently so VIS001 and MAL001 roles
        // can have different permission sets even when they share the same
        // "type" (e.g. cashier).
        Role::firstOrCreate(
            ['slug' => 'vis001_company_admin'],
            [
                'name' => 'Company Admin (Vismass)',
                'description' => 'Company admin for Vismass',
                'level' => 'company_admin',
                'company_code' => 'VIS001',
            ]
        );

        Role::firstOrCreate(
            ['slug' => 'vis001_technician'],
            [
                'name' => 'Technician (Vismass)',
                'description' => 'Technician for Vismass',
                'level' => 'technician',
                'company_code' => 'VIS001',
            ]
        );

        Role::firstOrCreate(
            ['slug' => 'vis001_cashier'],
            [
                'name' => 'Cashier (Vismass)',
                'description' => 'Cashier for Vismass',
                'level' => 'cashier',
                'company_code' => 'VIS001',
            ]
        );

        Role::firstOrCreate(
            ['slug' => 'vis001_sales_rep'],
            [
                'name' => 'Sales Representative (Vismass)',
                'description' => 'Sales rep for Vismass',
                'level' => 'sales_rep',
                'company_code' => 'VIS001',
            ]
        );

        Role::firstOrCreate(
            ['slug' => 'vis001_service_manager'],
            [
                'name' => 'Service Manager (Vismass)',
                'description' => 'Service manager for Vismass',
                'level' => 'service_manager',
                'company_code' => 'VIS001',
            ]
        );

        Role::firstOrCreate(
            ['slug' => 'vis001_stock_manager'],
            [
                'name' => 'Stock Manager (Vismass)',
                'description' => 'Stock manager for Vismass',
                'level' => 'stock_manager',
                'company_code' => 'VIS001',
            ]
        );

        // ─── Malibu (MAL001) company-specific roles ───────────────────────────
        Role::firstOrCreate(
            ['slug' => 'mal001_company_admin'],
            [
                'name' => 'Company Admin (Malibu)',
                'description' => 'Company admin for Malibu',
                'level' => 'company_admin',
                'company_code' => 'MAL001',
            ]
        );

        Role::firstOrCreate(
            ['slug' => 'mal001_cashier'],
            [
                'name' => 'Cashier (Malibu)',
                'description' => 'Cashier for Malibu',
                'level' => 'cashier',
                'company_code' => 'MAL001',
            ]
        );

        Role::firstOrCreate(
            ['slug' => 'mal001_sales_rep'],
            [
                'name' => 'Sales Representative (Malibu)',
                'description' => 'Sales rep for Malibu',
                'level' => 'sales_rep',
                'company_code' => 'MAL001',
            ]
        );
        Role::firstOrCreate(
            ['slug' => 'mal001_service_manager'],
            [
                'name' => 'Service Manager (Malibu)',
                'description' => 'Service manager for Malibu',
                'level' => 'service_manager',
                'company_code' => 'MAL001',
            ]
        );
        
        Role::firstOrCreate(
            ['slug' => 'mal001_stock_manager'],
            [
                'name' => 'Stock Manager (Malibu)',
                'description' => 'Stock manager for Malibu',
                'level' => 'stock_manager',
                'company_code' => 'MAL001',
            ]
        );
    }
}
