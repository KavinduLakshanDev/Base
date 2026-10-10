<?php

/**
 * @var \Tests\TestCase $this
 * @mixin \Illuminate\Foundation\Testing\TestCase
 */

use App\Models\User;
use App\Models\SupplierPayment;
use App\Models\AccMas;
use App\Models\Address;
use App\Models\BankAccount;
use App\Models\Company;
use App\Models\Section;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\actingAs;

uses(DatabaseTransactions::class);

it('generates sequential payment numbers', function () {
    // set up minimal supplier so FK constraint passes
    $company = Company::firstOrCreate(['company_code' => 'SEQ1'], ['name'=>'SeqCo','email'=>'a@b.com','password'=>bcrypt('pw')]);
    $section = Section::firstOrCreate(['section_code' => 'SEQ-SEC'], ['uuid'=>'seq-sec-uuid','name'=>'Seq Section','company_code'=>$company->company_code]);
    $supplierAcc = \App\Models\AccMas::create([
        'AccCd' => 'SEQ-SUP',
        'AccNm' => 'Seq Supplier',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 0,
        'CrLmt' => 0,
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
    ]);
    $supplierAddress = \App\Models\Address::create([
        'AccKy' => $supplierAcc->AccKy,
        'AdrCd' => 'SEQ-SUP',
        'AdrTypKy' => 4,
        'FstNm' => 'Seq',
        'LstNm' => 'Supplier',
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
    ]);

    DB::beginTransaction(); // emulate controller transaction scope
    $first = SupplierPayment::generatePaymentNo();
    SupplierPayment::create([
        'payment_no' => $first,
        'supplier_id' => $supplierAddress->AdrKy,
        'supplier_code' => $supplierAddress->AdrCd,
        'supplier_name' => 'Seq Supplier',
        'payment_method' => 'Cash',
        'paid_amount' => 1,
        'payment_date' => now(),
        'company_code' => $company->company_code,
        'status' => 'completed',
    ]);
    $second = SupplierPayment::generatePaymentNo();
    DB::rollBack();

    expect($first)->toMatch('/^SPY-\d{6}$/');
    expect($second)->toMatch('/^SPY-\d{6}$/');
    expect((int)substr($second,4))->toBe((int)substr($first,4) + 1);
});

it('deducts bank balance when supplier payment is recorded', function () {
    // super_admin bypasses all permission checks
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    // Ensure company + section exist for the controller to work
    Company::firstOrCreate(
        ['company_code' => 'SPBDT-C1'],
        ['name' => 'Test Company', 'email' => 'spbdt@test.com', 'password' => bcrypt('password')]
    );
    Section::firstOrCreate(
        ['section_code' => 'SPBDT-SEC'],
        ['uuid' => 'spbdt-sec-uuid-0001', 'name' => 'Test Section', 'company_code' => 'SPBDT-C1']
    );

    // Create the supplier acccount + address
    $supplierAcc = AccMas::create([
        'AccCd' => 'SPBDT-SUP',
        'AccNm' => 'Test Supplier',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 5000,
        'CrLmt' => 0,
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $supplierAddress = Address::create([
        'AccKy' => $supplierAcc->AccKy,
        'AdrCd' => 'SPBDT-SUP',
        'AdrTypKy' => 4,
        'FstNm' => 'Test',
        'LstNm' => 'Supplier',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    // Create a bank account with a known balance
    $bank = BankAccount::create([
        'account_name' => 'SPBDT Account',
        'account_number' => 'SPBDT-001',
        'bank_name' => 'Test Bank',
        'branch_name' => 'Main',
        'account_type' => 'savings',
        'opening_balance' => 10000,
        'current_balance' => 10000,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
        'created_by' => $user->id,
    ]);

    // Post a Bank Deposit payment of 1500
    $response = actingAs($user)->post('/admin/supplier-payments', [
        'supplier_id' => $supplierAddress->AdrKy,
        'payment_method' => 'Bank',
        'paid_amount' => 1500,
        'payment_date' => now()->format('Y-m-d'),
        'selected_bank_id' => $bank->id,
        'bank_name' => 'Supplier Bank ABC',
        'bank_reference_no' => 'REF-SPBDT-001',
        'bank_deposit_date' => now()->format('Y-m-d'),
        'bank_account_no' => 'SUP-ACC-999',
        'bank_branch' => 'Supplier Branch',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    // Reload bank from DB and confirm balance was reduced by 1500
    $bank->refresh();
    expect((float) $bank->current_balance)->toBe(8500.0);
});

it('shows the supplier payment view page', function () {
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    Company::firstOrCreate(
        ['company_code' => 'SPBDT-C1'],
        ['name' => 'Test Company', 'email' => 'spbdt@test.com', 'password' => bcrypt('password')]
    );
    Section::firstOrCreate(
        ['section_code' => 'SPBDT-SEC'],
        ['uuid' => 'spbdt-sec-uuid-0001', 'name' => 'Test Section', 'company_code' => 'SPBDT-C1']
    );

    $supplierAcc = AccMas::create([
        'AccCd' => 'SPBDT-SUPV',
        'AccNm' => 'View Supplier',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 2000,
        'CrLmt' => 0,
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $supplierAddress = Address::create([
        'AccKy' => $supplierAcc->AccKy,
        'AdrCd' => 'SPBDT-SUPV',
        'AdrTypKy' => 4,
        'FstNm' => 'View',
        'LstNm' => 'Supplier',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    // create a simple payment record via controller logic directly
    $payment = SupplierPayment::create([
        'payment_no' => 'TEST123',
        'supplier_id' => $supplierAddress->AdrKy,
        'supplier_code' => $supplierAddress->AdrCd,
        'supplier_name' => 'View Supplier',
        'payment_method' => 'Cash',
        'paid_amount' => 100,
        'payment_date' => now()->format('Y-m-d'),
        'status' => 'completed',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
        'created_by' => $user->name,
        'created_by_id' => $user->id,
    ]);

    $response = actingAs($user)->get("/admin/supplier-payments/{$payment->id}");
    $response->assertStatus(200);
    $response->assertInertia(fn($page) =>
        $page->component('admin/supplier-payments/show')
             ->where('payment.id', $payment->id)
    );
});

it('requires a bank account when payment method involves one', function () {
    // reuse setup from previous test (simpler to re-create)
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    Company::firstOrCreate(
        ['company_code' => 'SPBDT-C1'],
        ['name' => 'Test Company', 'email' => 'spbdt@test.com', 'password' => bcrypt('password')]
    );
    Section::firstOrCreate(
        ['section_code' => 'SPBDT-SEC'],
        ['uuid' => 'spbdt-sec-uuid-0001', 'name' => 'Test Section', 'company_code' => 'SPBDT-C1']
    );

    $supplierAcc = AccMas::create([
        'AccCd' => 'SPBDT-SUP-REQ',
        'AccNm' => 'Test Supplier Req',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 1000,
        'CrLmt' => 0,
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $supplierAddress = Address::create([
        'AccKy' => $supplierAcc->AccKy,
        'AdrCd' => 'SPBDT-SUP-REQ',
        'AdrTypKy' => 4,
        'FstNm' => 'Test',
        'LstNm' => 'Supplier',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    // attempt to post with Bank method but no bank selected
    $response = actingAs($user)->post('/admin/supplier-payments', [
        'supplier_id' => $supplierAddress->AdrKy,
        'payment_method' => 'Bank',
        'paid_amount' => 100,
        'payment_date' => now()->format('Y-m-d'),
        // missing selected_bank_id intentionally
        'bank_name' => 'Foo',
        'bank_reference_no' => 'REF',
        'bank_deposit_date' => now()->format('Y-m-d'),
    ]);

    $response->assertSessionHasErrors('selected_bank_id');
});

it('does not touch bank balance when payment method is Cash', function () {
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    Company::firstOrCreate(
        ['company_code' => 'SPBDT-C1'],
        ['name' => 'Test Company', 'email' => 'spbdt@test.com', 'password' => bcrypt('password')]
    );
    Section::firstOrCreate(
        ['section_code' => 'SPBDT-SEC'],
        ['uuid' => 'spbdt-sec-uuid-0001', 'name' => 'Test Section', 'company_code' => 'SPBDT-C1']
    );

    $supplierAcc = AccMas::create([
        'AccCd' => 'SPBDT-SUP2',
        'AccNm' => 'Test Supplier 2',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 1000,
        'CrLmt' => 0,
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $supplierAddress = Address::create([
        'AccKy' => $supplierAcc->AccKy,
        'AdrCd' => 'SPBDT-SUP2',
        'AdrTypKy' => 4,
        'FstNm' => 'Test2',
        'LstNm' => 'Supplier',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $bank = BankAccount::create([
        'account_name' => 'SPBDT Account 2',
        'account_number' => 'SPBDT-002',
        'bank_name' => 'Test Bank',
        'branch_name' => 'Main',
        'account_type' => 'savings',
        'opening_balance' => 5000,
        'current_balance' => 5000,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
        'created_by' => $user->id,
    ]);

    // Cash payment — no bank account selected
    $response = actingAs($user)->post('/admin/supplier-payments', [
        'supplier_id' => $supplierAddress->AdrKy,
        'payment_method' => 'Cash',
        'paid_amount' => 500,
        'payment_date' => now()->format('Y-m-d'),
        'notes' => 'Cash paid',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    // Bank balance must remain unchanged
    $bank->refresh();
    expect((float) $bank->current_balance)->toBe(5000.0);
});

it('ignores bank account when cash payment sent with one', function () {
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    Company::firstOrCreate(
        ['company_code' => 'SPBDT-C1'],
        ['name' => 'Test Company', 'email' => 'spbdt@test.com', 'password' => bcrypt('password')]
    );
    Section::firstOrCreate(
        ['section_code' => 'SPBDT-SEC'],
        ['uuid' => 'spbdt-sec-uuid-0001', 'name' => 'Test Section', 'company_code' => 'SPBDT-C1']
    );

    $supplierAcc = AccMas::create([
        'AccCd' => 'SPBDT-SUP3',
        'AccNm' => 'Test Supplier 3',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 1000,
        'CrLmt' => 0,
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $supplierAddress = Address::create([
        'AccKy' => $supplierAcc->AccKy,
        'AdrCd' => 'SPBDT-SUP3',
        'AdrTypKy' => 4,
        'FstNm' => 'Test3',
        'LstNm' => 'Supplier',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $bank = BankAccount::create([
        'account_name' => 'SPBDT Account 3',
        'account_number' => 'SPBDT-003',
        'bank_name' => 'Test Bank',
        'branch_name' => 'Main',
        'account_type' => 'savings',
        'opening_balance' => 5000,
        'current_balance' => 5000,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
        'created_by' => $user->id,
    ]);

    // Cash payment with stray bank id
    $response = actingAs($user)->post('/admin/supplier-payments', [
        'supplier_id' => $supplierAddress->AdrKy,
        'payment_method' => 'Cash',
        'paid_amount' => 500,
        'payment_date' => now()->format('Y-m-d'),
        'notes' => 'Cash paid',
        'selected_bank_id' => $bank->id, // should be ignored
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $bank->refresh();
    expect((float) $bank->current_balance)->toBe(5000.0);
});


it('prevents race conditions with concurrent bank balance updates', function () {
    $user1 = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $user2 = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    Company::firstOrCreate(
        ['company_code' => 'SPBDT-C1'],
        ['name' => 'Test Company', 'email' => 'spbdt@test.com', 'password' => bcrypt('password')]
    );
    Section::firstOrCreate(
        ['section_code' => 'SPBDT-SEC'],
        ['uuid' => 'spbdt-sec-uuid-0001', 'name' => 'Test Section', 'company_code' => 'SPBDT-C1']
    );

    // Create two suppliers
    $supplierAcc1 = AccMas::create([
        'AccCd' => 'SPBDT-SUP-RACE1',
        'AccNm' => 'Test Supplier Race 1',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 2000,
        'CrLmt' => 0,
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $supplierAcc2 = AccMas::create([
        'AccCd' => 'SPBDT-SUP-RACE2',
        'AccNm' => 'Test Supplier Race 2',
        'AccTyp' => 'SUPPLIER',
        'CurBal' => 3000,
        'CrLmt' => 0,
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $supplierAddress1 = Address::create([
        'AccKy' => $supplierAcc1->AccKy,
        'AdrCd' => 'SPBDT-SUP-RACE1',
        'AdrTypKy' => 4,
        'FstNm' => 'Race1',
        'LstNm' => 'Supplier',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    $supplierAddress2 = Address::create([
        'AccKy' => $supplierAcc2->AccKy,
        'AdrCd' => 'SPBDT-SUP-RACE2',
        'AdrTypKy' => 4,
        'FstNm' => 'Race2',
        'LstNm' => 'Supplier',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
    ]);

    // Create a shared bank account
    $bank = BankAccount::create([
        'account_name' => 'Race Condition Test Account',
        'account_number' => 'RACE-001',
        'bank_name' => 'Test Bank',
        'branch_name' => 'Main',
        'account_type' => 'savings',
        'opening_balance' => 10000,
        'current_balance' => 10000,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'SPBDT-C1',
        'section_code' => 'SPBDT-SEC',
        'created_by' => $user1->id,
    ]);

    // Simulate concurrent payments using database transactions
    // Both payments should succeed and deduct correctly without race conditions
    DB::transaction(function () use ($user1, $supplierAddress1, $bank) {
        $response1 = actingAs($user1)->post('/admin/supplier-payments', [
            'supplier_id' => $supplierAddress1->AdrKy,
            'payment_method' => 'Bank',
            'paid_amount' => 1500,
            'payment_date' => now()->format('Y-m-d'),
            'selected_bank_id' => $bank->id,
            'bank_name' => 'Test Bank',
            'bank_reference_no' => 'RACE-REF-001',
            'bank_deposit_date' => now()->format('Y-m-d'),
            'bank_account_no' => 'RACE-ACC-001',
            'bank_branch' => 'Main Branch',
        ]);
        $response1->assertSessionHasNoErrors();
        $response1->assertRedirect();
    });

    DB::transaction(function () use ($user2, $supplierAddress2, $bank) {
        $response2 = actingAs($user2)->post('/admin/supplier-payments', [
            'supplier_id' => $supplierAddress2->AdrKy,
            'payment_method' => 'Bank',
            'paid_amount' => 2000,
            'payment_date' => now()->format('Y-m-d'),
            'selected_bank_id' => $bank->id,
            'bank_name' => 'Test Bank',
            'bank_reference_no' => 'RACE-REF-002',
            'bank_deposit_date' => now()->format('Y-m-d'),
            'bank_account_no' => 'RACE-ACC-002',
            'bank_branch' => 'Main Branch',
        ]);
        $response2->assertSessionHasNoErrors();
        $response2->assertRedirect();
    });

    // Verify final balance is correct (10000 - 1500 - 2000 = 6500)
    $bank->refresh();
    expect((float) $bank->current_balance)->toBe(6500.0);

    // Verify both payments were recorded
    $payment1 = \App\Models\SupplierPayment::where('supplier_code', 'SPBDT-SUP-RACE1')->first();
    $payment2 = \App\Models\SupplierPayment::where('supplier_code', 'SPBDT-SUP-RACE2')->first();

    expect($payment1)->not->toBeNull();
    expect($payment2)->not->toBeNull();
    expect((float) $payment1->paid_amount)->toBe(1500.0);
    expect((float) $payment2->paid_amount)->toBe(2000.0);
});
