<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BankAccountPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_bank_accounts()
    {
        $response = $this->get('/admin/bank-accounts');
        $response->assertRedirect('/login');
    }

    public function test_user_without_permission_sees_error()
    {
        // ensure the account is not a super_admin or company admin
        $user = User::factory()->create(['user_type' => 'company_user']);
        $company = Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $response = $this->get('/admin/bank-accounts');
        // unauthorized users are redirected (302)
        $response->assertStatus(302);
    }

    public function test_user_with_permission_can_view_and_create()
    {
        $user = User::factory()->create();
        $company = Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        // assign a role and grant it the necessary permissions
        $role = \App\Models\Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
        $user->role_id = $role->id;
        $user->save();

        $view = \App\Models\Permission::firstOrCreate(
            ['slug' => 'bank_accounts.view'],
            ['name' => 'View Bank Accounts', 'description' => 'Can view bank accounts', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $create = \App\Models\Permission::firstOrCreate(
            ['slug' => 'bank_accounts.create'],
            ['name' => 'Create Bank Accounts', 'description' => 'Can create bank accounts', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$view->id, $create->id]);

        $this->actingAs($user);
        $response = $this->get('/admin/bank-accounts');
        $response->assertStatus(200);

        $response = $this->get('/admin/bank-accounts/create');
        $response->assertStatus(200);
    }
}
