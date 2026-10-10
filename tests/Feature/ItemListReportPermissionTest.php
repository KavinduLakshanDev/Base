<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ItemListReportPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_item_list()
    {
        $resp = $this->get('/reports/item-list');
        $resp->assertRedirect('/login');
    }

    public function test_user_without_permission_gets_redirect()
    {
        $user = User::factory()->create(['user_type' => 'company_user']);
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $resp = $this->get('/reports/item-list');
        $resp->assertStatus(302);
    }

    public function test_user_with_permission_can_view()
    {
        $user = User::factory()->create();
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $role = Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
        $user->role_id = $role->id;
        $user->save();

        $perm = \App\Models\Permission::firstOrCreate(
            ['slug' => 'reports.item_list'],
            ['name' => 'View Item List Report', 'description' => 'Can view item list report', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);
        $this->get('/reports/item-list')->assertStatus(200);
    }
}
