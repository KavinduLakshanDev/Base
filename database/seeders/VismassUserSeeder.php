<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class VismassUserSeeder extends Seeder
{
    public function run(): void
    {
        // Check if user exists
        $user = User::where('email', 'vismass@example.com')->first();

        // Get company admin role
        $role = Role::where('slug', 'vis001_company_admin')->first();

        if (!$user) {
            // Create the user
            User::create([
                'email' => 'vismass@example.com',
                'password' => Hash::make('password'), // Default password
                'first_name' => 'Vismass',
                'last_name' => 'Admin',
                'user_type' => 'company_admin',
                'company_code' => 'VIS001',
                'section_code' => 'VIS-SEC-002',
                'role_id' => $role ? $role->id : null,
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
            ]);

            echo "User vismass@example.com created as company_admin.\n";
        } else {
            // Update if exists
            $user->update([
                'user_type' => 'company_admin',
                'company_code' => 'VIS001',
                'section_code' => 'VIS-SEC-002',
                'role_id' => $role ? $role->id : null,
                'is_active' => true,
            ]);
            echo "User vismass@example.com updated to company_admin.\n";
        }

        // Add Sales Rep for Vismass
        $salesRep = User::where('email', 'sales1.vismass@example.com')->first();
        $repRole = Role::where('slug', 'vis001_sales_rep')->first();

        if (!$salesRep) {
            User::create([
                'email' => 'sales1.vismass@example.com',
                'password' => Hash::make('password'),
                'first_name' => 'Vismass',
                'last_name' => 'Sales Rep 1',
                'user_type' => 'company_user',
                'company_code' => 'VIS001',
                'section_code' => 'VIS-SEC-003',
                'role_id' => $repRole ? $repRole->id : null,
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
            ]);
            echo "User sales1.vismass@example.com created as sales_rep.\n";
        }
    }
}