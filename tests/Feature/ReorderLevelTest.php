<?php

/**
 * @mixin \Tests\TestCase
 */

use App\Models\ItemMaster;
use App\Models\ReorderLevel;
use App\Models\ReorderLevelLog;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);

it('creates a reorder level and writes a creation log, and product API returns the correct level', function () {
    /** @var \Tests\TestCase $this */
    /** @var \App\Models\User $user */
    $user = User::factory()->create(['section_code' => 'S01', 'company_code' => 'C01','user_type'=>'super_admin']);
    // grant permissions for manage/create/update/delete as needed
    $role = \App\Models\Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
    $user->role_id = $role->id;
    $user->save();
    $perms = ['reorder_levels.manage','reorder_levels.create','reorder_levels.delete'];
    foreach ($perms as $slug) {
        $p = \App\Models\Permission::firstOrCreate(
            ['slug' => $slug],
            ['name' => ucfirst(str_replace('_', ' ', $slug)), 'description' => ucfirst(str_replace('_', ' ', $slug)), 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$p->id]);
    }
    $this->actingAs($user);

    // company must exist for foreign key
    \App\Models\Company::factory()->create(['company_code' => 'C01']);
    $section = Section::factory()->create(['section_code' => 'S01', 'company_code' => 'C01']);
    $item = ItemMaster::factory()->create([
        'company_code' => 'C01',
        'ItemCode' => 'ITEM-A',
        'ItmNm' => 'Widget',
    ]);

    // perform creation via controller route
    $resp = $this->post('/pos/reorder-levels', [
        'item_code' => $item->ItemCode,
        'section_code' => $section->section_code,
        'reorder_level' => 7,
    ]);

    $resp->assertRedirect(route('pos.reorder-levels.index'));

    $this->assertDatabaseHas('reorder_levels', [
        'item_code' => $item->ItemCode,
        'section_code' => $section->section_code,
        'reorder_level' => 7,
        'company_code' => 'C01',
    ]);

    $this->assertDatabaseHas('reorder_level_logs', [
        'item_code' => $item->ItemCode,
        'section_code' => $section->section_code,
        'action' => 'created',
        'new_level' => 7,
        'changed_by' => $user->id,
    ]);

    // API should return the value for the current user's section
    $apiResp = $this->get("/pos/api/reorder-level/{$item->ItemCode}");
    $apiResp->assertStatus(200)
            ->assertJson(['has_reorder_level' => true, 'reorder_level' => 7]);

    // figure out the record we just created so we can hit the history endpoint
    $new = ReorderLevel::where('item_code', $item->ItemCode)
                       ->where('section_code', $section->section_code)
                       ->first();
    expect($new)->not->toBeNull();

    // history endpoint should return a record corresponding to the creation
    $histResp = $this->get(route('pos.reorder-levels.logs', $new));
    $histResp->assertStatus(200)
             ->assertJsonStructure(['logs' => [['action','new_level']]]);
});

it('updates a reorder level and logs the old and new values', function () {
    /** @var \Tests\TestCase $this */
    /** @var \App\Models\User $user */
    $user = User::factory()->create(['section_code' => 'S02', 'company_code' => 'C02','user_type'=>'super_admin']);
    $role = \App\Models\Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
    $user->role_id = $role->id;
    $user->save();
    // give all three perms again
    $perms = ['reorder_levels.manage','reorder_levels.create','reorder_levels.delete'];
    foreach ($perms as $slug) {
        $p = \App\Models\Permission::firstOrCreate(
            ['slug' => $slug],
            ['name' => ucfirst(str_replace('_', ' ', $slug)), 'description' => ucfirst(str_replace('_', ' ', $slug)), 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$p->id]);
    }
    $this->actingAs($user);

    \App\Models\Company::factory()->create(['company_code' => 'C02']);
    $section = Section::factory()->create(['section_code' => 'S02', 'company_code' => 'C02']);
    $item = ItemMaster::factory()->create([
        'company_code' => 'C02',
        'ItemCode' => 'ITEM-B',
        'ItmNm' => 'Gadget',
    ]);

    $level = ReorderLevel::create([
        'item_code' => $item->ItemCode,
        'section_code' => $section->section_code,
        'company_code' => 'C02',
        'reorder_level' => 3,
    ]);

    $resp = $this->put("/pos/reorder-levels/{$level->id}", [
        'item_code' => $item->ItemCode,
        'section_code' => $section->section_code,
        'reorder_level' => 11,
    ]);

    // also check history endpoint after update
    $histResp = $this->get(route('pos.reorder-levels.logs', $level));
    $histResp->assertStatus(200)
             ->assertJson(fn ($json) =>
                 $json->where('logs.0.action', 'updated')
                      // decimal fields are returned as strings, compare with full precision
                      ->where('logs.0.old_level', '3.0000')
                      ->where('logs.0.new_level', '11.0000')
             );

    $resp->assertRedirect(route('pos.reorder-levels.index'));

    $this->assertDatabaseHas('reorder_levels', [
        'id' => $level->id,
        'reorder_level' => 11,
    ]);

    $this->assertDatabaseHas('reorder_level_logs', [
        'reorder_level_id' => $level->id,
        'action' => 'updated',
        'old_level' => 3,
        'new_level' => 11,
        'changed_by' => $user->id,
    ]);
});

it('deletes a reorder level and records a deletion log', function () {
    /** @var \Tests\TestCase $this */
    /** @var \App\Models\User $user */
    $user = User::factory()->create(['section_code' => 'S03', 'company_code' => 'C03','user_type'=>'super_admin']);
    $role = \App\Models\Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
    $user->role_id = $role->id;
    $user->save();
    $perms = ['reorder_levels.manage','reorder_levels.create','reorder_levels.delete'];
    foreach ($perms as $slug) {
        $p = \App\Models\Permission::firstOrCreate(
            ['slug' => $slug],
            ['name' => ucfirst(str_replace('_', ' ', $slug)), 'description' => ucfirst(str_replace('_', ' ', $slug)), 'uuid' => (string) \Illuminate\Support\Str::uuid()]
        );
        $role->permissions()->syncWithoutDetaching([$p->id]);
    }
    $this->actingAs($user);

    \App\Models\Company::factory()->create(['company_code' => 'C03']);
    $section = Section::factory()->create(['section_code' => 'S03', 'company_code' => 'C03']);
    $item = ItemMaster::factory()->create([
        'company_code' => 'C03',
        'ItemCode' => 'ITEM-C',
        'ItmNm' => 'Thingamajig',
    ]);

    $level = ReorderLevel::create([
        'item_code' => $item->ItemCode,
        'section_code' => $section->section_code,
        'company_code' => 'C03',
        'reorder_level' => 5,
    ]);

    $resp = $this->delete("/pos/reorder-levels/{$level->id}");
    $resp->assertRedirect(route('pos.reorder-levels.index'));

    $this->assertDatabaseMissing('reorder_levels', ['id' => $level->id]);
    // foreign key is null-on-delete, so id may be wiped out after the
    // record is removed; just verify other fields are correct.
    $this->assertDatabaseHas('reorder_level_logs', [
        'action' => 'deleted',
        'old_level' => 5,
        'new_level' => null,
        'changed_by' => $user->id,
    ]);
});

it('product index shows branch_reorder_level when section filter is applied', function () {
    /** @var \Tests\TestCase $this */
    /** @var \App\Models\User $user */
    // use a normal company_user (not superadmin) so the product query will
    // join reorder_levels and populate branch_reorder_level
    $user = User::factory()->create(['section_code' => 'S04', 'company_code' => 'C04','user_type'=>'company_user']);
    $role = \App\Models\Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
    $user->role_id = $role->id;
    $user->save();
    $perm = \App\Models\Permission::firstOrCreate(
        ['slug' => 'products.view'],
        ['name' => 'View Products', 'description' => 'Can view products', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $role->permissions()->syncWithoutDetaching([$perm->id]);
    $this->actingAs($user);

    \App\Models\Company::factory()->create(['company_code' => 'C04']);
    $section = Section::factory()->create(['section_code' => 'S04', 'company_code' => 'C04']);
    $item = ItemMaster::factory()->create([
        'company_code' => 'C04',
        'ItemCode' => 'ITEM-D',
        'ItmNm' => 'Doodad',
        'available_sections' => json_encode([$section->section_code]),
    ]);

    ReorderLevel::create([
        'item_code' => $item->ItemCode,
        'section_code' => $section->section_code,
        'company_code' => 'C04',
        'reorder_level' => 22,
    ]);

    $resp = $this->get('/pos/products?section_code=' . $section->section_code);
    $resp->assertStatus(200);

    $resp->assertInertia(fn (Assert $page) =>
        $page->has('items.data', fn ($items) =>
            // the value is a decimal string from the database
            $items->where('0.branch_reorder_level', '22.0000')
        )
    );
});

test('create page includes barcode on product list', function () {
    /** @var \Tests\TestCase $this */
    /** @var \App\Models\User $user */
    $user = User::factory()->create(['section_code' => 'S99', 'company_code' => 'CB99']);

    // give the user permission to visit the reorder-levels page (same permission
    // that the other tests use earlier in this file)
    $role = \App\Models\Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
    $user->role_id = $role->id;
    $user->save();
    $perm = \App\Models\Permission::firstOrCreate(
        ['slug' => 'reorder_levels.create'],
        ['name' => 'Create Reorder Levels', 'description' => 'Can create reorder levels', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $role->permissions()->syncWithoutDetaching([$perm->id]);

    $this->actingAs($user);

    \App\Models\Company::factory()->create(['company_code' => 'CB99']);
    $section = Section::factory()->create(['section_code' => 'S99', 'company_code' => 'CB99']);
    ItemMaster::create([
        'company_code' => 'CB99',
        'section_code' => 'S99',
        'ItmKy' => 700,
        'ItemCode' => 'BCITEM',
        'ItmNm' => 'Barcode Item',
        'BarCode' => 'ZZ123',
        'Status' => 'A',
        'fInAct' => 0,
    ]);

    $response = $this->get('/pos/reorder-levels/create');
    $response->assertStatus(200);
    $props = $response->getOriginalContent()->getData()['page']['props'];
    $this->assertNotEmpty($props['products']);
    $found = collect($props['products'])->firstWhere('ItemCode', 'BCITEM');
    $this->assertArrayHasKey('barcode', $found);
    $this->assertEquals('ZZ123', $found['barcode']);
});
