<?php

use App\Models\Company;
use App\Models\User;
use App\Models\Section;
use App\Models\SalesTransaction;
use Inertia\Testing\AssertableInertia as Assert;

// tests rely on the global database reset configuration (RefreshDatabase) to avoid trait collisions

it('returns section list and can filter profit report by section and item type', function () {
    $company = Company::factory()->create(['company_code' => 'C1', 'name' => 'Test Co']);
    $user = User::factory()->create(['company_code' => 'C1']);

    // assign role and permission so report is accessible
    $role = \App\Models\Role::factory()->create(['slug' => 'cashier', 'level' => 'section_user']);
    $user->role_id = $role->id;
    $user->save();
    $perm = \App\Models\Permission::firstOrCreate(
        ['slug' => 'reports.profit'],
        ['name' => 'View Profit Report', 'description' => 'Can view general profit report', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $role->permissions()->syncWithoutDetaching([$perm->id]);

    $sectionA = Section::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'name' => 'Section A',
    ]);
    $sectionB = Section::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-B',
        'name' => 'Section B',
    ]);

    $txA = SalesTransaction::factory()->create([
        'section_code' => 'SEC-A',
        'transaction_date' => now()->toDateString(),
        'status' => 'completed',
        'invoice_no' => 'PRI-001',
    ]);
    $txB = SalesTransaction::factory()->create([
        'section_code' => 'SEC-B',
        'transaction_date' => now()->toDateString(),
        'status' => 'completed',
        'invoice_no' => 'ITM-001',
    ]);

    \App\Models\SalesTransactionItem::factory()->create([
        'sales_transaction_id' => $txA->id,
        'invoice_no' => $txA->invoice_no,
        'item_code' => 'ITEM1',
        'item_name' => 'Item 1',
        'quantity' => 1,
        'unit_price' => 100,
        'cost_price' => 60,
        'section_code' => 'SEC-A',
    ]);

    // second item does not set section_code, relying on the transaction filter instead
    \App\Models\SalesTransactionItem::factory()->create([
        'sales_transaction_id' => $txB->id,
        'invoice_no' => $txB->invoice_no,
        'item_code' => 'ITEM2',
        'item_name' => 'Item 2',
        'quantity' => 1,
        'unit_price' => 200,
        'cost_price' => 80,
        // no section_code here
    ]);

    $from = now()->subDay()->format('Y-m-d');
    $to = now()->format('Y-m-d');

    // no filter returns both items and sections (initially only sales)
    $resp = $this->actingAs($user)->get("/reports/profit-report?start_date={$from}&end_date={$to}");
    $resp->assertStatus(200);
    $resp->assertInertia(fn(Assert $page) => $page
        ->component('Reports/ProfitReport')
        ->where('company.name', 'Test Co')
        ->has('salesItems', 2)
        ->has('sections', 2)
    );

    // section filter only shows one item
    $resp2 = $this->actingAs($user)->get("/reports/profit-report?start_date={$from}&end_date={$to}&section_code=SEC-A");
    $resp2->assertStatus(200);
    $resp2->assertInertia(fn(Assert $page) => $page
        ->component('Reports/ProfitReport')
        ->where('filters.section_code', 'SEC-A')
        ->has('salesItems', 1)
    );

    // item type filter (printer) should return only PRI invoice
    $resp3 = $this->actingAs($user)->get("/reports/profit-report?start_date={$from}&end_date={$to}&item_type=printer");
    $resp3->assertStatus(200);
    $resp3->assertInertia(fn(Assert $page) => $page
        ->component('Reports/ProfitReport')
        ->where('filters.item_type', 'printer')
        ->has('salesItems', 1)
    );

    // add a service section (type service) and a job in it
    $serviceSection = Section::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-S',
        'name' => 'Service Section',
        'section_type' => 'service',
    ]);
    // job assigned to SEC-S but item itself has same section (no change)
    $job = \App\Models\ServiceJob::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-S',
        'actual_completion_date' => now()->toDateString(),
        'status' => 'completed',
        'job_number' => 'JOB-001',
    ]);
    \App\Models\ServiceJobItem::factory()->create([
        'service_job_id' => $job->id,
        'item_code' => 'SERV1',
        'item_name' => 'Service Charge',
        'quantity' => 1,
        'unit_price' => 500,
        'cost_price' => 200,
        'item_type' => 'service_charge',
        'section_code' => 'SEC-S',
    ]);

    // also add a job where the job section differs but item section matches filter
    $jobX = \App\Models\ServiceJob::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'actual_completion_date' => now()->toDateString(),
        'status' => 'completed',
        'job_number' => 'JOB-X',
    ]);
    \App\Models\ServiceJobItem::factory()->create([
        'service_job_id' => $jobX->id,
        'item_code' => 'SERVX2',
        'item_name' => 'Service From A',
        'quantity' => 1,
        'unit_price' => 250,
        'cost_price' => 100,
        'item_type' => 'service_charge',
        'section_code' => 'SEC-S',
    ]);


    // after adding one service job, unfiltered count should increment by one
    $resp3b = $this->actingAs($user)->get("/reports/profit-report?start_date={$from}&end_date={$to}");
    $resp3b->assertStatus(200);
    $resp3b->assertInertia(fn(Assert $page) => $page
        ->has('salesItems', 3) // 2 sales + 1 service
    );

    // section filter returns only the service row
    $resp4 = $this->actingAs($user)->get("/reports/profit-report?start_date={$from}&end_date={$to}&section_code=SEC-S");
    $resp4->assertStatus(200);
    $resp4->assertInertia(fn(Assert $page) => $page
        ->where('filters.section_code', 'SEC-S')
        ->has('salesItems', 1)
    );

    // another service job that only has estimated date and is still pending
    $job2 = \App\Models\ServiceJob::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-S',
        'estimated_completion_date' => now()->toDateString(),
        'status' => 'pending',
        'job_number' => 'JOB-002',
    ]);
    \App\Models\ServiceJobItem::factory()->create([
        'service_job_id' => $job2->id,
        'item_code' => 'SERV2',
        'item_name' => 'Second Charge',
        'quantity' => 2,
        'unit_price' => 300,
        'cost_price' => 100,
        'item_type' => 'service_charge',
    ]);

    // unfiltered now should have two service items plus the original two sales
    $respBeforeThird = $this->actingAs($user)->get("/reports/profit-report?start_date={$from}&end_date={$to}");
    $respBeforeThird->assertStatus(200);
    $respBeforeThird->assertInertia(fn(Assert $page) => $page
        ->has('salesItems', 4) // 2 sales + 2 services
    );

    $resp5 = $this->actingAs($user)->get("/reports/profit-report?start_date={$from}&end_date={$to}&section_code=SEC-S");
    $resp5->assertStatus(200);
    $resp5->assertInertia(fn(Assert $page) => $page
        ->where('filters.section_code', 'SEC-S')
        ->has('salesItems', 2) // now should include both jobs
    );

    // a third job only has received_date and should also appear
    $job3 = \App\Models\ServiceJob::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-S',
        'received_date' => now()->toDateString(),
        'status' => 'pending',
        'job_number' => 'JOB-003',
    ]);
    \App\Models\ServiceJobItem::factory()->create([
        'service_job_id' => $job3->id,
        'item_code' => 'SERV3',
        'item_name' => 'Third Charge',
        'quantity' => 3,
        'unit_price' => 150,
        'cost_price' => 50,
        'item_type' => 'service_charge',
    ]);

    $resp6 = $this->actingAs($user)->get("/reports/profit-report?start_date={$from}&end_date={$to}&section_code=SEC-S");
    $resp6->assertStatus(200);
    $resp6->assertInertia(fn(Assert $page) => $page
        ->where('filters.section_code', 'SEC-S')
        ->has('salesItems', 3) // now three service rows
    );

    // also verify service item shows up even if section_type is not labeled 'service'
    $otherSection = Section::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-X',
        'name' => 'Misc Section',
        'section_type' => 'store',
    ]);
    $job4 = \App\Models\ServiceJob::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-X',
        'actual_completion_date' => now()->toDateString(),
        'status' => 'completed',
        'job_number' => 'JOB-004',
    ]);
    \App\Models\ServiceJobItem::factory()->create([
        'service_job_id' => $job4->id,
        'item_code' => 'SERVX',
        'item_name' => 'Misc Charge',
        'quantity' => 1,
        'unit_price' => 400,
        'cost_price' => 100,
        'item_type' => 'service_charge',
    ]);

    $resp7 = $this->actingAs($user)->get("/reports/profit-report?start_date={$from}&end_date={$to}&section_code=SEC-X");
    $resp7->assertStatus(200);
    $resp7->assertInertia(fn(Assert $page) => $page
        ->where('filters.section_code', 'SEC-X')
        ->has('salesItems', 1)
    );
});

it('resolves unit from item master for stationary items', function () {
    $company = Company::factory()->create(['company_code' => 'C1', 'name' => 'Test Co']);
    $user = User::factory()->create(['company_code' => 'C1']);
    $role = \App\Models\Role::factory()->create(['slug' => 'cashier']);
    $user->role_id = $role->id;
    $user->save();
    $perm = \App\Models\Permission::firstOrCreate(['slug' => 'reports.profit']);
    $role->permissions()->syncWithoutDetaching([$perm->id]);

    $itemMaster = \App\Models\ItemMaster::factory()->create([
        'ItemCode' => 'STAT-001',
        'Unit' => 'PACK',
    ]);

    $tx = SalesTransaction::factory()->create([
        'transaction_date' => now()->toDateString(),
        'invoice_no' => 'VIS-ITM-001',
    ]);

    \App\Models\SalesTransactionItem::factory()->create([
        'sales_transaction_id' => $tx->id,
        'invoice_no' => $tx->invoice_no,
        'item_code' => $itemMaster->ItemCode,
        'product_id' => $itemMaster->ItmKy,
        'unit' => null, // Explicitly set unit to null
    ]);

    $from = now()->subDay()->format('Y-m-d');
    $to = now()->format('Y-m-d');

    $resp = $this->actingAs($user)->get("/reports/profit-report?start_date={$from}&end_date={$to}&item_type=stationary");

    $resp->assertStatus(200);
    $resp->assertInertia(fn(Assert $page) => $page
        ->component('Reports/ProfitReport')
        ->has('salesItems', 1, fn (Assert $item) => $item
            ->where('item_code', 'STAT-001')
            ->where('unit', 'PACK')
            ->etc()
        )
    );
});
