<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\DayOpeningBalance;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DayOpeningBalancePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_opening_balances()
    {
        $response = $this->get('/admin/day-opening-balances');
        $response->assertRedirect('/login');
    }

    public function test_user_without_permission_sees_error()
    {
        // ensure this account is not a super admin (factory picks randomly)
        $user = User::factory()->create(['user_type' => 'company_user']);
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $response = $this->get('/admin/day-opening-balances');
        // user should not be allowed; expect redirect with error
        $response->assertStatus(302);
    }

    public function test_user_with_permission_can_visit_pages()
    {
        // user_type set so we don't default to super_admin
        $user = User::factory()->create(['user_type' => 'company_user']);
        Company::factory()->create(['company_code' => $user->company_code]);
        $section = Section::factory()->create(['company_code' => $user->company_code]);
        $user->section_code = $section->section_code;
        $user->save();

        // give user a non-admin role (cashier) so permission slug is required
        $role = \App\Models\Role::where('slug', 'cashier')->first();
        if (! $role) {
            $role = \App\Models\Role::factory()->create([
                'slug' => 'cashier',
                'level' => 'section_user',
            ]);
        }
        $user->role_id = $role->id;
        $user->save();

        // ensure permission record exists (seeder may not have run)
        $perm = \App\Models\Permission::firstOrCreate(
            ['slug' => 'day_opening_balances.manage'],
            [
                'name' => 'Manage Day Opening Balances',
                'description' => 'Can view/create/edit/delete day opening balances',
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
            ]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);
        $this->get('/admin/day-opening-balances')->assertStatus(200);
        $this->get('/admin/day-opening-balances/create')->assertStatus(200);
        $response = $this->post('/admin/day-opening-balances', [
            'user_id' => $user->id,
            'balance_date' => now()->toDateString(),
            'opening_balance' => 100,
            'currency' => 'USD',
        ]);

        // should have succeeded and redirected to index
        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('day_opening_balances', [
            'user_id' => $user->id,
            'opening_balance' => 100,
        ]);
    }
}
