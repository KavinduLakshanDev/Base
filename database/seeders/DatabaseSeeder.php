<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            CompanySeeder::class,
            RoleSeeder::class,
            PermissionSeeder::class,
            ControlMasterSeeder::class,
            SectionSeeder::class,
            VatRateSeeder::class,
            VismassUserSeeder::class,
            MalibuUserSeeder::class,
            UsersSeeder::class,
        ]);

        // User::factory(10)->create();

        User::firstOrCreate(
            ['email' => 'admin@unitec.edu.ph'],
            [
                'username' => 'unitec_admin',
                'first_name' => 'Unitec',
                'last_name' => 'Admin',
                'password' => 'unitec@123Admin',
                'user_type' => 'super_admin',
                'role_id' => 1,
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
            ]
        );
    }
}
