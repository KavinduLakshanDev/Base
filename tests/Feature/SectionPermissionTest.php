<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SectionPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected()
    {
        $resp = $this->get('/sections');
        $resp->assertRedirect('/login');
    }

    public function test_user_without_permission_is_blocked()
    {
        $user = User::factory()->create(['user_type' => 'company_user']);
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $resp = $this->get('/sections');
        $resp->assertStatus(302);
    }

    public function test_user_with_permission_can_access_index_and_create()
    {
        $user = User::factory()->create();
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $role = Role::factory()->create(['slug' => 'admin', 'level' => 'company_admin']);
        $user->role_id = $role->id;
        $user->save();

        $perm = \App\Models\Permission::firstOrCreate(
            ['slug' => 'sections.manage'],
            ['name' => 'Manage Sections', 'description' => 'Can manage sections', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);
        $this->get('/sections')->assertStatus(200);
        $this->get('/sections/create')->assertStatus(200);
    }
}
