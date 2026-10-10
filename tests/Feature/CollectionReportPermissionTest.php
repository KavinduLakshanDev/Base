<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectionReportPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_collection_report()
    {
        $response = $this->get('/reports/collection-report');
        $response->assertRedirect('/login');
    }

    public function test_user_without_permission_sees_error()
    {
        $user = User::factory()->create(['user_type' => 'company_user']);
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $response = $this->get('/reports/collection-report');
        $response->assertStatus(302);
    }

    public function test_user_with_permission_can_view_report()
    {
        $user = User::factory()->create();
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        // attach a role so hasPermission can check correctly
        $role = Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
        $user->role_id = $role->id;
        $user->save();

        $perm = \App\Models\Permission::firstOrCreate(
            ['slug' => 'reports.collection'],
            ['name' => 'View Collection Report', 'description' => 'Can view collection reports', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);
        $response = $this->get('/reports/collection-report');
        $response->assertStatus(200);
    }
}
