<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfitReportPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected()
    {
        $resp = $this->get('/reports/profit-report');
        $resp->assertRedirect('/login');
    }

    public function test_user_without_permission_sees_error()
    {
        $user = User::factory()->create(['user_type' => 'company_user']);
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $resp = $this->get('/reports/profit-report');
        $resp->assertStatus(302);
    }

    public function test_user_with_permission_can_access()
    {
        $user = User::factory()->create();
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $role = Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
        $user->role_id = $role->id;
        $user->save();

        $perm = \App\Models\Permission::firstOrCreate(
            ['slug' => 'reports.profit'],
            ['name' => 'View Profit Report', 'description' => 'Can view general profit report', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);
        $this->get('/reports/profit-report')->assertStatus(200);
    }
}
