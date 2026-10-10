<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class VatRatePermissionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure guests are redirected and logged in users without the
     * correct permission are forbidden when hitting the controller.
     */
    public function test_user_without_permission_cannot_access()
    {
        $user = User::factory()->create(['user_type' => 'company_user']);
        $company = Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        // not authenticated -> redirected to login
        $response = $this->get('/company/vat-rates');
        $response->assertRedirect('/login');

        // act as user who has no vat_rates permission
        $this->actingAs($user);
        $response = $this->get('/company/vat-rates');
        $response->assertStatus(403);

        $response = $this->postJson('/company/vat-rates', [
            'vat_rate' => 12.00,
            'effective_date' => now()->format('Y-m-d'),
        ]);
        $response->assertStatus(403);
    }

    public function test_user_with_manage_permission_can_use_endpoints()
    {
        $user = User::factory()->create();
        $company = Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $role = Role::factory()->create(['slug' => 'vat-manager', 'level' => 'company_admin']);
        $user->role_id = $role->id;
        $user->save();

        $perm = Permission::firstOrCreate([
            'slug' => 'vat_rates.manage'
        ], [
            'name' => 'Manage VAT Rates',
            'description' => 'Can manage VAT rates',
            'uuid' => (string) Str::uuid(),
        ]);
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);

        // index should work
        $response = $this->get('/company/vat-rates');
        $response->assertStatus(200);

        // create should also succeed
        $response = $this->postJson('/company/vat-rates', [
            'vat_rate' => 18.5,
            'effective_date' => now()->format('Y-m-d'),
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('vat_rates', ['vat_rate' => 18.5]);
    }
}
