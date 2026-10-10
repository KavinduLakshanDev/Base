<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\ServiceJob;
use App\Models\ItemMaster;
use App\Models\User;
use App\Models\StockInHand;
use App\Models\Section;
use App\Models\Company;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

it('cannot add an item to a service job without edit permission', function () {
    $job = ServiceJob::create([
        'job_number' => 'SJ-TEST-1',
        'customer_name' => 'Test',
        'customer_phone' => '123',
        'problem_description' => 'placeholder',
        'status' => 'pending',
        'received_date' => now()->toDateString(),
    ]);
    $user = User::factory()->create();

    $this->actingAs($user);

    $response = $this->post(route('service-jobs.add-item', $job), [
        'item_type' => 'part',
        'item_name' => 'Test Item',
        'quantity' => 1,
        'unit_price' => 10,
        'batch_no' => 'BATCH1',
    ]);

    $response->assertRedirect();
    // ensure item was not created due to lack of permission
    $this->assertDatabaseMissing('service_job_items', [
        'service_job_id' => $job->id,
        'batch_no' => 'BATCH1',
    ]);
});

it('allows adding an item with batch number when user has edit permission', function () {
    $job = ServiceJob::create([
        'job_number' => 'SJ-TEST-2',
        'customer_name' => 'Editor',
        'customer_phone' => '1234',
        'problem_description' => 'editing',
        'status' => 'pending',
        'received_date' => now()->toDateString(),
    ]);
    $permission = Permission::create([
        'name' => 'Edit Service Jobs',
        'slug' => 'service_jobs.edit',
        'description' => 'Can edit service jobs',
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
    ]);

    $role = Role::create([
        'name' => 'JobEditor',
        'slug' => 'job-editor',
        'level' => 'user',
        'company_code' => $job->company_code,
    ]);
    $role->permissions()->attach($permission->id);

    $user = User::factory()->create([ 'role_id' => $role->id, 'company_code' => $job->company_code ]);

    $this->actingAs($user);

    $response = $this->post(route('service-jobs.add-item', $job), [
        'item_type' => 'part',
        'item_name' => 'Test Item',
        'quantity' => 2,
        'unit_price' => 50,
        'batch_no' => 'B-123',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $this->assertDatabaseHas('service_job_items', [
        'service_job_id' => $job->id,
        'batch_no' => 'B-123',
        'quantity' => 2,
        'unit_price' => 50,
    ]);
});



it('renders batch number on show page', function () {
    $permission = Permission::firstOrCreate([
        'slug' => 'service_jobs.view'
    ], [
        'name' => 'View Service Jobs',
        'description' => 'Can view service jobs',
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
    ]);

    $role = Role::create([
        'name' => 'Viewer',
        'slug' => 'viewer',
        'level' => 'user',
        'company_code' => 'TESTVIEW',
    ]);
    $role->permissions()->attach($permission->id);

    $user = User::factory()->create(['role_id' => $role->id, 'company_code' => 'TESTVIEW']);

    $job = ServiceJob::create([
        'job_number' => 'SJ-TEST-3',
        'customer_name' => 'Viewer',
        'customer_phone' => '999',
        'problem_description' => 'viewing',
        'status' => 'pending',
        'company_code' => 'TESTVIEW',
        'received_date' => now()->toDateString(),
    ]);
    $job->items()->create([    
        'item_type' => 'part',
        'item_name' => 'Foo',
        'quantity' => 1,
        'unit_price' => 1,
        'batch_no' => 'SHOWBATCH',
    ]);

    $this->actingAs($user);
    $response = $this->get(route('service-jobs.show', $job));
    $response->assertInertia(fn ($page) =>
        $page->component('ServiceJobs/Show')
             ->where('job.items.0.batch_no', 'SHOWBATCH')
    );
});

// ensure purchase records returned by service job search carry batch_no and can be added
it('searches purchase items with batch and adds correctly', function () {
    // create purchase-det style row
    $pd = \App\Models\PurchaseDet::factory()->create([
        'serial_number' => 'SER123',
        'batch_no' => 'PBATCH',
        'SalePrice' => 100,
        'flnAct' => false,
        'Status' => 'A',
    ]);

    $this->actingAs(User::factory()->create());
    $resp = $this->getJson('/service-jobs/search/items?search=SER123');
    $resp->assertStatus(200);
    $json = $resp->json();
    expect(collect($json)->first()['batch_no'])->toBe('PBATCH');

    // now simulate front-end submitting the item using returned ItmKy
    $job = ServiceJob::create([
        'job_number' => 'SJ-TST',
        'customer_name' => 'X',
        'customer_phone' => '0',
        'problem_description' => 't',
        'status' => 'pending',
        'received_date' => now()->toDateString(),
    ]);

    $user = User::factory()->create();
    Permission::firstOrCreate(['slug' => 'service_jobs.edit'],[
        'name'=>'', 'description'=>'','uuid'=> (string) \Illuminate\Support\Str::uuid()
    ]);
    $user->role->permissions()->attach(Permission::where('slug','service_jobs.edit')->first());
    $this->actingAs($user);

    $addResp = $this->post(route('service-jobs.add-item', $job), [
        'item_type'=>'part',
        'item_name'=>'foo',
        'quantity'=>1,
        'unit_price'=>100,
        'batch_no'=>'PBATCH',
    ]);
    $addResp->assertRedirect();
    $this->assertDatabaseHas('service_job_items',['service_job_id'=>$job->id,'batch_no'=>'PBATCH']);
});

it('filters batch stock by user section and shows zero availability when no stock', function () {
    // Create company and section
    $company = Company::create([
        'company_code' => 'TESTSEC',
        'company_name' => 'Test Section Company',
        'is_active' => true,
    ]);

    $serviceSection = Section::create([
        'section_code' => 'SERV',
        'section_name' => 'Service Section',
        'company_code' => 'TESTSEC',
    ]);

    $otherSection = Section::create([
        'section_code' => 'OTHER',
        'section_name' => 'Other Section',
        'company_code' => 'TESTSEC',
    ]);

    // Create user in service section
    $user = User::factory()->create([
        'section_code' => 'SERV',
        'company_code' => 'TESTSEC',
        'user_type' => 'technician',
    ]);

    // give the user a role and grant wastage search permission so our API calls are allowed
    $perm = Permission::firstOrCreate(
        ['slug' => 'wastages.search'],
        ['name' => 'Search Wastage Products', 'description' => 'Can search products when recording wastage', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $role = Role::firstOrCreate([
        'slug' => 'tech-role',
    ], [
        'name' => 'Technician Role',
        'level' => 'user',
        'company_code' => 'TESTSEC',
    ]);
    $role->permissions()->syncWithoutDetaching([$perm->id]);
    $user->role_id = $role->id;
    $user->save();

    // Create item
    $item = ItemMaster::create([
        'ItemCode' => 'TEST-ITEM',
        'ItmNm' => 'Test Item',
        'ItmKy' => 999,
    ]);

    // Create stock in service section
    StockInHand::create([
        'ItemKy' => 999,
        'batch_no' => 'SERV-BATCH',
        'Qty' => 10,
        'section_code' => 'SERV',
        'OrdDate' => now(),
    ]);

    // Create stock in other section
    StockInHand::create([
        'ItemKy' => 999,
        'batch_no' => 'OTHER-BATCH',
        'Qty' => 5,
        'section_code' => 'OTHER',
        'OrdDate' => now(),
    ]);

    $this->actingAs($user);

    // Test API call with section_code
    $response = $this->get("/wastages/product-batches?product_id=999&section_code=SERV");
    $response->assertStatus(200);

    $batches = $response->json();
    expect($batches)->toHaveCount(1);
    expect($batches[0]['batch_no'])->toBe('SERV-BATCH');
    expect($batches[0]['available_quantity'])->toBe(10.0);

    // Test API call without section_code (should use user's section)
    $response2 = $this->get("/wastages/product-batches?product_id=999");
    $response2->assertStatus(200);

    $batches2 = $response2->json();
    expect($batches2)->toHaveCount(1);
    expect($batches2[0]['batch_no'])->toBe('SERV-BATCH');

    // Test with item that has no stock in user's section
    $item2 = ItemMaster::create([
        'ItemCode' => 'NO-STOCK-ITEM',
        'ItmNm' => 'No Stock Item',
        'ItmKy' => 1000,
    ]);

    $response3 = $this->get("/wastages/product-batches?product_id=1000");
    $response3->assertStatus(200);

    $batches3 = $response3->json();
    expect($batches3)->toHaveCount(1);
    expect($batches3[0]['batch_no'])->toBeNull();
    expect($batches3[0]['available_quantity'])->toBe(0.0);
});
