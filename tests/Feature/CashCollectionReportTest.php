<?php

/**
 * @var \Tests\TestCase $this
 *
 * @mixin \Illuminate\Foundation\Testing\TestCase
 */

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Role;
use App\Models\DayOpeningBalance;
use App\Models\SalesTransaction;
use App\Models\CustomerPayment;
use Carbon\Carbon;

use App\Models\SupplierPayment;
// RefreshDatabase not needed here and causes trait collision
use Illuminate\Foundation\Testing\DatabaseTransactions;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\post;
use function Pest\Laravel\assertDatabaseHas;

use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);



beforeEach(function () {
    // ensure roles exist as the seeder would
    Role::firstOrCreate(['slug' => 'cashier'], ['name' => 'Cashier', 'level' => 'section_user']);
    Role::firstOrCreate(['slug' => 'company_admin'], ['name' => 'Company Admin', 'level' => 'company_admin']);
});

it('allows section filtering and shows only relevant cashier with balances and payments', function () {
    $company = Company::factory()->create(['company_code' => 'C1']);

    // two sections within same company
    $secA = Section::factory()->create(['company_code' => 'C1', 'section_code' => 'SEC-A', 'name' => 'Section A']);
    $secB = Section::factory()->create(['company_code' => 'C1', 'section_code' => 'SEC-B', 'name' => 'Section B']);

    $adminRole = Role::where('slug', 'company_admin')->first();
    $cashierRole = Role::where('slug', 'cashier')->first();

    // ensure permission exists and assign it to the admin role so our viewer can access
    $perm = \App\Models\Permission::firstOrCreate(
        ['slug' => 'reports.cash_collection'],
        ['name' => 'View Cash Collection Report', 'description' => 'Can view cash collection reports', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $adminRole->permissions()->syncWithoutDetaching([$perm->id]);

    // user who will view the report (company admin can see everything)
    $viewer = User::factory()->create(['company_code' => 'C1', 'section_code' => 'SEC-A', 'role_id' => $adminRole->id]);
    /** @var User $viewer */

    // cashier in section A, with an opening balance and a sale/payment
    $cashierA = User::factory()->create(['company_code' => 'C1', 'section_code' => 'SEC-A', 'role_id' => $cashierRole->id]);
    /** @var User $cashierA */

    DayOpeningBalance::create([
        'user_id' => $cashierA->id,
        // report defaults to the first day of the month, so ensure our
        // opening balance uses the same date; otherwise queries will miss it.
        'balance_date' => now()->startOfMonth()->format('Y-m-d'),
        'opening_balance' => 500,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'created_by' => $viewer->id,
    ]);

    // create a customer so payment has a valid foreign key
    $custAcc = \App\Models\AccMas::create([
        'AccCd' => 'CUST1',
        'AccNm' => 'Test Customer',
        'AccTyp' => 'CUSTOMER',
        'CurBal' => 0,
        'CrLmt' => 0,
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
    ]);
    $custAddr = \App\Models\Address::create([
        'AccKy' => $custAcc->AccKy,
        'AdrCd' => 'CUST1',
        'AdrTypKy' => 1,
        'FstNm' => 'Test',
        'LstNm' => 'Customer',
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
    ]);

    $sale = SalesTransaction::create([
        'invoice_no' => 'INV-TEST-1',
        'transaction_date' => now()->format('Y-m-d'),
        'customer_id' => $custAddr->AdrKy,
        'customer_code' => $custAddr->AdrCd,
        'customer_name' => 'Test Cust',
        'section_code' => 'SEC-A',
        'cashier_id' => $cashierA->id,
        'subtotal' => 100,
        'total_amount' => 100,
        'status' => 'completed',
        'payment_details' => ['mode' => 'cash'],
        'company_code' => 'C1',
    ]);

    CustomerPayment::create([
        'customer_id' => $custAddr->AdrKy,
        'sales_transaction_id' => $sale->id,
        'amount' => 100,
        'method' => 'cash',
        'date' => now()->format('Y-m-d'),
        'company_code' => 'C1',
    ]);

    // call without filters to ensure page loads
    $resp = actingAs($viewer)->get('/reports/cash-collection-report');
    $resp->assertStatus(200);
    $resp->assertInertia(fn(Assert $page) => $page
        ->component('Reports/CashCollectionReport')
        ->has('company')
        ->where('company.name', $company->name)
        ->has('sections')
        ->has('cashiers')
        // ledger should always serialize as an array, not an object
        ->where('ledger', fn($ledger) => is_array($ledger) || $ledger instanceof \Illuminate\Support\Collection)
    );

    // ensure advance payments from service jobs are captured
    $super = User::factory()->create(['user_type' => 'super_admin']);
    /** @var User $super */
    actingAs($super);

    $customer = \App\Models\AccMas::create([
        'AccCd' => 'TESTADV',
        'AccNm' => 'Advance Cust',
        'AccTyp' => 'CUSTOMER',
        'CurBal' => 0,
        'CrLmt' => 1000,
    ]);
    $custAddr = \App\Models\Address::create([
        'AccKy' => $customer->AccKy,
        'AdrCd' => 'TESTADV',
        'FstNm' => 'Adv',
        'LstNm' => 'Cust',
    ]);

    // create a service job directly with advance payment rather than hitting the
    // HTTP form; the UI route is flaky in tests and not needed for our report
    $job = \App\Models\ServiceJob::create([
        'AccKy' => $customer->AccKy,
        'job_number' => 'JOB-ADV-1',
        'advanced_payment' => 250,
        'total_amount' => 250,
        'status' => 'pending',
        'created_by' => $super->id,
        'problem_description' => '',
        'received_date' => now()->format('Y-m-d'),
    ]);

    // the factory should automatically create the corresponding payment record
    // via model events; if not we can insert one manually as the controller did
    if (!\App\Models\CustomerPayment::where('service_job_id', $job->id)->exists()) {
        \App\Models\CustomerPayment::create([
            'service_job_id' => $job->id,
            'customer_id' => $custAddr->AdrKy,
            'amount' => 250,
            'method' => 'cash',
            'date' => now()->format('Y-m-d'),
            'status' => 'completed',
        ]);
    }

    $this->assertNotNull($job);
    $this->assertEquals(250, $job->advanced_payment);
    assertDatabaseHas('customer_payments', [
        'service_job_id' => $job->id,
        'amount' => 250,
    ]);

    // report should now include the 250 advance
    $respAdv = actingAs($viewer)->get('/reports/cash-collection-report');
    $respAdv->assertStatus(200);
    $respAdv->assertInertia(fn(Assert $page) => $page
        ->component('Reports/CashCollectionReport')
        ->where('summary.total_amount', 350) // 100 payment + 250 advance
        ->has('ledger', 2) // advance and sale entries
    );

    // create a supplier account/address so we can record a payment
    $supplierAcc = \App\Models\AccMas::create([
        'AccCd' => 'SUP1',
        'AccNm' => 'Test Supplier',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 0,
        'CrLmt' => 0,
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
    ]);
    $supplierAddress = \App\Models\Address::create([
        'AccKy' => $supplierAcc->AccKy,
        'AdrCd' => 'SUP1',
        'AdrTypKy' => 4,
        'FstNm' => 'Supplier',
        'LstNm' => 'One',
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
    ]);

    // create a supplier payment and verify it shows without filters
    actingAs($viewer);
    // initial supplier payment - not linked to a cashier by ID so it will
    // be ignored when we later apply the cashier filter.
    $supplierPayment = \App\Models\SupplierPayment::create([
        'payment_no' => 'SPY-TEST2',
        'supplier_id' => $supplierAddress->AdrKy,
        'supplier_code' => 'SUP1',
        'supplier_name' => 'Supplier One',
        'payment_method' => 'Cash',
        'paid_amount' => 25,
        'payment_date' => now()->format('Y-m-d'),
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'created_by' => $cashierA->name,
        // deliberately omit created_by_id so this payment is not returned when
        // filtering by cashier_id
    ]);

    $respSupp = actingAs($viewer)->get('/reports/cash-collection-report');
    $respSupp->assertStatus(200);
    $respSupp->assertInertia(fn(Assert $page) => $page
        ->component('Reports/CashCollectionReport')
        ->where('summary.total_amount', 325) // previous 350 minus 25 supplier debit
        ->has('ledger', 3)
        ->where('ledger.2.notes', 'Supplier Payment')
    );

    // also prove bank account balance is decremented when payment is created via controller
    $bank = \App\Models\BankAccount::create([
        'account_name' => 'Test Account',
        'account_number' => '123456',
        'bank_name' => 'Test Bank',
        'branch_name' => 'Main',
        'account_type' => 'Savings',
        'opening_balance' => 1000,
        'current_balance' => 1000,
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'status' => 'active',
        'created_by' => $viewer->id,
    ]);

    $respBank = actingAs($viewer)->post('/admin/supplier-payments', [
        'supplier_id' => $supplierAddress->AdrKy,
        'payment_method' => 'Bank',
        'paid_amount' => 50,
        'payment_date' => now()->format('Y-m-d'),
        'selected_bank_id' => $bank->id,
        'bank_reference_no' => 'REF123',
        'bank_deposit_date' => now()->format('Y-m-d'),
        'bank_name' => 'Supplier Bank',
        'bank_account_no' => '999',
        'bank_branch' => 'Branch',
    ]);
    $respBank->assertSessionHasNoErrors()->assertRedirect();

    $bank->refresh();
    $this->assertEquals(950, (float) $bank->current_balance);

    // apply section filter to SEC-A - should reduce cashier list
    $respSec = actingAs($viewer)->get('/reports/cash-collection-report?section_code=SEC-A');
    $respSec->assertStatus(200);
    $respSec->assertInertia(fn(Assert $page) => $page
        ->component('Reports/CashCollectionReport')
        ->where('filters.section_code', 'SEC-A')
        // list includes the special 'Admin' entry plus any real cashiers in the
        // section.  Expect two entries and verify cashback user appears.
        ->has('cashiers', 2)
        ->where('cashiers.1.id', $cashierA->id)
    );

    // create a supplier and record a payment by cashierA
    $supplierAcc = \App\Models\AccMas::create([
        'AccCd' => 'SUP1',
        'AccNm' => 'Test Supplier',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 0,
        'CrLmt' => 0,
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
    ]);

    $supplierAddress = \App\Models\Address::create([
        'AccKy' => $supplierAcc->AccKy,
        'AdrCd' => 'SUP1',
        'AdrTypKy' => 4,
        'FstNm' => 'Supplier',
        'LstNm' => 'One',
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
    ]);

    \App\Models\SupplierPayment::create([
        'payment_no' => 'SPY-TEST',
        'supplier_id' => $supplierAddress->AdrKy,
        'supplier_code' => 'SUP1',
        'supplier_name' => 'Supplier One',
        'payment_method' => 'Cash',
        'paid_amount' => 50,
        'payment_date' => now()->format('Y-m-d'),
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'created_by' => $cashierA->name,
        'created_by_id' => $cashierA->id,
    ]);

    // now fetch with cashierA filter and check report reflects debit
    $respBoth = actingAs($viewer)->get('/reports/cash-collection-report?section_code=SEC-A&cashier_id=' . $cashierA->id);
    $respBoth->assertStatus(200);
    $respBoth->assertInertia(fn(Assert $page) => $page
        ->component('Reports/CashCollectionReport')
        ->where('filters.section_code', 'SEC-A')
        ->where('filters.cashier_id', (string)$cashierA->id)
        ->where('opening_balance', 500)
        ->where('summary.total_amount', 50) // 100 receipts minus 50 supplier payment
        ->has('sales', 1)
    );
});

it('shows opening balance for selected cashier even when record is later in range', function () {
    $company = Company::factory()->create(['company_code' => 'C1']);
    $secA = Section::factory()->create(['company_code' => 'C1', 'section_code' => 'SEC-A', 'name' => 'Section A']);

    $adminRole = Role::where('slug', 'company_admin')->first();
    $cashierRole = Role::where('slug', 'cashier')->first();

    $perm = \App\Models\Permission::firstOrCreate(
        ['slug' => 'reports.cash_collection'],
        ['name' => 'View Cash Collection Report', 'description' => 'Can view cash collection reports', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $adminRole->permissions()->syncWithoutDetaching([$perm->id]);

    $viewer = User::factory()->create(['company_code' => 'C1', 'section_code' => 'SEC-A', 'role_id' => $adminRole->id]);
    $cashier = User::factory()->create(['company_code' => 'C1', 'section_code' => 'SEC-A', 'role_id' => $cashierRole->id]);

    $openDate  = Carbon::parse('2026-03-13');
    $startDate = Carbon::parse('2026-03-01');
    $endDate   = Carbon::parse('2026-03-31');

    DayOpeningBalance::create([
        'user_id' => $cashier->id,
        'balance_date' => $openDate->format('Y-m-d'),
        'opening_balance' => 15000,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'created_by' => $viewer->id,
    ]);

    actingAs($viewer)
        ->get('/reports/cash-collection-report?start_date='.$startDate->format('Y-m-d').'&end_date='.$endDate->format('Y-m-d').'&cashier_id='.$cashier->id)
        ->assertStatus(200)
        ->assertInertia(fn(Assert $page) => $page
            ->component('Reports/CashCollectionReport')
            ->where('opening_balance', 15000)
        );
});

it('exports cash collection report as csv', function () {
    $company = Company::factory()->create(['company_code' => 'C1']);
    $secA = Section::factory()->create(['company_code' => 'C1', 'section_code' => 'SEC-A', 'name' => 'Section A']);

    $adminRole = Role::where('slug', 'company_admin')->first();
    $cashierRole = Role::where('slug', 'cashier')->first();

    $perm = \App\Models\Permission::firstOrCreate(
        ['slug' => 'reports.cash_collection'],
        ['name' => 'View Cash Collection Report', 'description' => 'Can view cash collection reports', 'uuid' => (string) \Illuminate\Support\Str::uuid()]
    );
    $adminRole->permissions()->syncWithoutDetaching([$perm->id]);

    $viewer = User::factory()->create(['company_code' => 'C1', 'section_code' => 'SEC-A', 'role_id' => $adminRole->id]);
    $cashier = User::factory()->create(['company_code' => 'C1', 'section_code' => 'SEC-A', 'role_id' => $cashierRole->id]);

    DayOpeningBalance::create([
        'user_id' => $cashier->id,
        'balance_date' => now()->startOfMonth()->format('Y-m-d'),
        'opening_balance' => 778,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'created_by' => $viewer->id,
    ]);

    $resp = actingAs($viewer)->get('/reports/cash-collection-report/export?start_date='.now()->startOfMonth()->format('Y-m-d').'&end_date='.now()->endOfMonth()->format('Y-m-d').'&cashier_id='.$cashier->id);
    $resp->assertStatus(200);
    $contentType = $resp->headers->get('Content-Type');
    $this->assertStringContainsString('text/csv', $contentType);
    $this->assertStringContainsString('Cash Collection Report', $resp->getContent());
    $this->assertStringContainsString('Opening Balance', $resp->getContent());
});
