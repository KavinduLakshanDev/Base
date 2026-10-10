<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_company_admin_sees_roles_but_not_super_admin()
    {
        // arrange: make some roles
        Role::firstOrCreate(['slug' => 'super_admin'], ['name' => 'Super Admin', 'level' => 'super_admin']);
        Role::firstOrCreate(['slug' => 'company_admin'], ['name' => 'Company Admin', 'level' => 'company_admin']);
        Role::firstOrCreate(['slug' => 'manager'], ['name' => 'Manager', 'level' => 'user']);

        // create user and give it company_admin role
        $role = Role::where('slug', 'company_admin')->first();
        $user = User::factory()->create(['user_type' => 'company_admin', 'role_id' => $role->id]);

        // ensure permission exists and attach to role
        $perm = \App\Models\Permission::firstOrCreate(
            ['slug' => 'roles.view'],
            ['name' => 'View Roles', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);

        // use named route to ensure correct path
        $response = $this->get(route('roles.index'));
        $response->assertStatus(200);

        // page should not contain Super Admin entry but should contain other roles
        $response->assertDontSee('Super Admin');
        $response->assertSee('Company Admin');
        $response->assertSee('Manager');
    }
}
