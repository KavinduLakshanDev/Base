<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReorderLevelPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected()
    {
        $resp = $this->get('/pos/reorder-levels');
        $resp->assertRedirect('/login');
    }

    public function test_user_without_permission_is_blocked()
    {
        $user = User::factory()->create(['user_type' => 'company_user']);
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $resp = $this->get('/pos/reorder-levels');
        $resp->assertStatus(302);
    }

    public function test_user_with_permission_can_access_index_and_forms()
    {
        $user = User::factory()->create();
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $role = Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
        $user->role_id = $role->id;
        $user->save();

        $perm = \App\Models\Permission::firstOrCreate(
            ['slug' => 'reorder_levels.manage'],
            ['name' => 'Manage Reorder Levels', 'description' => 'Can view/create/edit/delete reorder levels', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);
        $this->get('/pos/reorder-levels')->assertStatus(200);
        $this->get('/pos/reorder-levels/create')->assertStatus(200);
    }
}
