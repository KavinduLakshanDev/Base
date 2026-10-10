<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrinterStockBinCardPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_printer_bin_card()
    {
        $resp = $this->get('/reports/printer-stock-bin-card');
        $resp->assertRedirect('/login');
    }

    public function test_user_without_permission_is_redirected()
    {
        $user = User::factory()->create(['user_type' => 'company_user']);
        Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        $this->actingAs($user);
        $resp = $this->get('/reports/printer-stock-bin-card');
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
            ['slug' => 'reports.printing.stock.bin.view'],
            ['name' => 'View Printer Stock Bin Card', 'description' => 'Can view printer stock bin card', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$perm->id]);

        $this->actingAs($user);
        $this->get('/reports/printer-stock-bin-card')->assertStatus(200);
    }
}
