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

class WastagePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_without_permission_cannot_access_wastage_pages()
    {
        $user = User::factory()->create(['user_type' => 'company_user']);
        $company = Company::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);

        // guest redirected
        $response = $this->get('/wastages');
        $response->assertRedirect('/login');

        $this->actingAs($user);
        $response = $this->get('/wastages');
        $response->assertStatus(302); // redirected back due to permission

        $response = $this->post('/wastages', [
            'product_id' => 1,
            'quantity' => 1,
            'reason' => 'test',
            'wastage_date' => now()->format('Y-m-d'),
            'status' => 'pending',
            'section_id' => Section::first()->id,
        ]);
        $response->assertStatus(302);
    }

    public function test_user_with_permissions_can_create_and_view()
    {
        $user = User::factory()->create();
        $company = Company::factory()->create(['company_code' => $user->company_code]);
        // add two sections for this company and one for a different company to test filtering
        Section::factory()->create(['company_code' => $user->company_code]);
        Section::factory()->create(['company_code' => $user->company_code]);
        // the foreign section's company must exist to satisfy FK constraint
        Company::factory()->create(['company_code' => 'OTHER01']);
        Section::factory()->create(['company_code' => 'OTHER01']);

        $role = Role::factory()->create(['slug' => 'wastage-admin', 'level' => 'company_admin']);
        $user->role_id = $role->id;
        $user->save();

        $view = Permission::firstOrCreate(
            ['slug' => 'wastages.view'],
            ['name' => 'View Wastage Records', 'description' => 'Can view wastage records', 'uuid' => (string) Str::uuid()]
        );
        $create = Permission::firstOrCreate(
            ['slug' => 'wastages.create'],
            ['name' => 'Create Wastage Records', 'description' => 'Can create wastage records', 'uuid' => (string) Str::uuid()]
        );

        $role->permissions()->syncWithoutDetaching([$view->id, $create->id]);

        // also give search permission so APIs work
        $search = Permission::firstOrCreate(
            ['slug' => 'wastages.search'],
            ['name' => 'Search Wastage Products', 'description' => 'Can search products when recording wastage', 'uuid' => (string) Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$search->id]);

        $this->actingAs($user);

        // ensure create page returns sections filtered by company
        $createResp = $this->get('/wastages/create');
        $createResp->assertStatus(200);
        // verify the database actually has two sections belonging to the company
        $ownSectionsCount = Section::where('company_code', $user->company_code)->count();
        $this->assertGreaterThan(0, $ownSectionsCount);
        // response should include exactly that many
        $createResp->assertInertia(fn($page) =>
            $page->component('wastage/create')
                 ->has('sections', $ownSectionsCount)
        );

        // back to original behaviour: listing and posting
        $response = $this->get('/wastages');
        $response->assertStatus(200);

        $response = $this->post('/wastages', [
            'product_id' => 'PD_1', // orphaned purchase placeholder
            'quantity' => 1,
            'reason' => 'test',
            'wastage_date' => now()->format('Y-m-d'),
            'status' => 'pending',
            'section_id' => Section::where('company_code', $user->company_code)->first()->id,
        ]);
        $response->assertRedirect('/wastages');

        // attempt to post using a section from a different company should fail
        $foreign = Section::where('company_code', 'OTHER01')->first();
        $failResp = $this->post('/wastages', [
            'product_id' => 'PD_1',
            'quantity' => 1,
            'reason' => 'test',
            'wastage_date' => now()->format('Y-m-d'),
            'status' => 'pending',
            'section_id' => $foreign->id,
        ]);
        $failResp->assertSessionHasErrors('section_id');

        // search endpoint should be accessible
        $searchResp = $this->get('/wastages/product-batches?product_id=0');
        $searchResp->assertStatus(200);
    }
}
