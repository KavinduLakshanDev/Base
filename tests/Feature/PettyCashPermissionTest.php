<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\PettyCashCategory;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PettyCashPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_petty_cash()
    {
        $response = $this->get('/admin/petty-cash-categories');
        $response->assertRedirect('/login');
    }

    public function test_user_without_permission_sees_error()
    {
        $user = User::factory()->create();
        $user->user_type = 'company_user';
        $user->save();

        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $response = $this->get('/admin/petty-cash-categories');
        // should not be allowed; expect a redirect (302) and not status 200
        $response->assertStatus(302);
    }

    public function test_user_with_permission_can_visit_pages()
    {
        $user = User::factory()->create();
        $user->user_type = 'company_user';
        $user->company_code = 'TEST';
        $user->section_code = 'S1';
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        // ensure user has a proper role so hasPermission() can evaluate
        $role = \App\Models\Role::factory()->create(['level' => 'company_admin']);
        $user->role_id = $role->id;
        $user->save();

        $perm = \App\Models\Permission::where('slug', 'petty_cash.create')->first();
        if ($perm) {
            // attach permission to the role (not to user directly) – role-based checks used
            $role->permissions()->syncWithoutDetaching([$perm->id]);
        }

        $this->actingAs($user);
        $this->get('/admin/petty-cash-categories')->assertStatus(200);
        $this->get('/admin/petty-cash-categories/create')->assertStatus(200);
        // attempt store should succeed (we can post minimal data)
        $this->post('/admin/petty-cash-categories', ['name' => 'foo'])->assertRedirect();
        $this->assertDatabaseHas('petty_cash_categories', ['name' => 'foo']);

        // transactions pages should also be accessible
        $this->get('/admin/petty-cash-transactions')->assertStatus(200);
        // creating a transaction is done via the UI or API; verify store route works
        $category = PettyCashCategory::create([
            'name' => 'Misc',
            'company_code' => $user->company_code,
            'section_code' => $user->section_code,
        ]);
        $this->post('/admin/petty-cash-transactions', [
            'category_id' => $category->id,
            'amount' => 10,
            'transaction_date' => now()->toDateString(),
        ])->assertRedirect();
        $this->assertDatabaseHas('petty_cash_transactions', ['category_id' => $category->id, 'amount' => 10]);
    }
}