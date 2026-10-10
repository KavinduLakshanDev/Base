<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrinterWastagePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected()
    {
        $resp = $this->get('/printer-wastages');
        $resp->assertRedirect('/login');
    }

    public function test_user_without_permission_is_blocked()
    {
        $user = User::factory()->create(['user_type' => 'company_user']);
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $resp = $this->get('/printer-wastages');
        $resp->assertStatus(302);
    }

    public function test_user_with_view_permission_can_access_index()
    {
        $user = User::factory()->create();
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $role = Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
        $user->role_id = $role->id;
        $user->save();

        $perm = \App\Models\Permission::firstOrCreate(
            ['slug' => 'printing.wastage.view'],
            ['name' => 'View Printer Wastage', 'description' => 'Can view printer wastage records', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);
        $this->get('/printer-wastages')->assertStatus(200);
    }

    public function test_user_with_create_permission_can_access_create()
    {
        $user = User::factory()->create();
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $role = Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
        $user->role_id = $role->id;
        $user->save();

        $perm = \App\Models\Permission::firstOrCreate(
            ['slug' => 'printing.wastage.create'],
            ['name' => 'Create Printer Wastage', 'description' => 'Can create or delete printer wastage records', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);
        $this->get('/printer-wastages/create')->assertStatus(200);
    }
}
