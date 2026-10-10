<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesReportPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_view()
    {
        $resp = $this->get('/reports/sales');
        $resp->assertRedirect('/login');
    }

    public function test_user_without_permission_is_redirected()
    {
        $user = User::factory()->create(['user_type' => 'company_user']);
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $resp = $this->get('/reports/sales');
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
            ['slug' => 'reports.sales'],
            ['name' => 'View Sales Report', 'description' => 'Can view sales reports', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);
        $this->get('/reports/sales')->assertStatus(200);
        // pdf route should also be guarded
        $this->get('/reports/sales/pdf?from_date=2020-01-01&to_date=2020-01-02')->assertStatus(302);
    }
}
