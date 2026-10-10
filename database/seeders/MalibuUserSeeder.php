<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MalibuUserSeeder extends Seeder
{
    public function run(): void
    {
        // Check if user exists
        $user = User::where('email', 'malibu@example.com')->first();

        // Get company admin role
        $role = Role::where('slug', 'mal001_company_admin')->first();

        if (!$user) {
            // Create the user
            User::create([
                'email' => 'malibu@example.com',
                'password' => Hash::make('password'), // Default password
                'first_name' => 'Malibu',
                'last_name' => 'Admin',
                'user_type' => 'company_admin',
                'company_code' => 'MAL001',
                'section_code' => 'MAL-SEC-002', // Delivery section
                'role_id' => $role ? $role->id : null,
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
            ]);

            echo "User malibu@example.com created as company_admin.\n";
        } else {
            // Update if exists
            $user->update([
                'user_type' => 'company_admin',
                'role_id' => $role ? $role->id : null,
                'is_active' => true,
            ]);
            echo "User malibu@example.com updated to company_admin.\n";
        }
    }
}