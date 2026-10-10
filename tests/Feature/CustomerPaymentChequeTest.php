<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\CustomerPayment;
use App\Models\AccMas;
use App\Models\AccTrn;
use App\Models\Address;
use App\Models\User;
use App\Models\Company;

uses(DatabaseTransactions::class);

test('cheque payment saves correctly in customer_payments and acc_mas', function () {
    // Create a company and user for authentication
    $company = Company::create([
        'name' => 'Test Company',
        'company_code' => 'COMP001',
        'email' => 'company@example.com',
        'password' => bcrypt('password'),
    ]);

    $user = User::create([
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'company_code' => 'COMP001',
        'role_id' => 1, // superadmin
        'user_type' => 'super_admin',
    ]);

    // Create test data
    $accMas = AccMas::create([
        'AccCd' => 'CUS001',
        'AccNm' => 'Test Customer',
        'CurBal' => 1000.00, // Initial balance
        'company_code' => 'COMP001',
        'section_code' => 'SEC001',
    ]);

    $address = Address::create([
        'AccKy' => $accMas->AccKy,
        'AdrCd' => 'CUS001',
        'FstNm' => 'John',
        'LstNm' => 'Doe',
    ]);

    // Authenticate the user
    $this->actingAs($user);

    // Simulate POST request to store payment
    $response = $this->post('/admin/customer-payments', [
        'customer_id'    => $address->AdrKy,
        'payment_method' => 'cheque',
        'amount'         => 500.00,
        'payment_date'   => '2023-10-01',
        'cheque_no'      => '123456',
        'cheque_bank'    => 'Test Bank',
        'cheque_branch'  => 'Main Branch',
        'cheque_date'    => '2023-10-01',
        'notes'          => 'Test cheque payment',
    ]);

    $response->assertStatus(200);
    $response->assertJson(['success' => true]);

    // Check CustomerPayment table
    expect(DB::table('customer_payments')->where([
        'customer_id' => $address->AdrKy,
        'customer_code' => 'CUS001',
        'amount' => 500.00,
        'date' => '2023-10-01',
        'method' => 'cheque',
        'cheque_no' => '123456',
        'bank_name' => 'Test Bank',
        'branch' => 'Main Branch',
        'cheque_date' => '2023-10-01',
        'notes' => 'Test cheque payment',
        'status' => 'completed',
    ])->exists())->toBeTrue();

    // Check AccMas CurBal updated
    $updatedAccMas = AccMas::find($accMas->AccKy);
    expect((float)$updatedAccMas->CurBal)->toBe(500.00); // 1000 - 500

    // No accounting transaction is created by the legacy storePayment method, so
    // we no longer assert on AccTrn entries here.
});

// -------- additional case: bank account dropdown selection --------

test('cheque payment using selected bank account populates bank and branch', function () {
    // recreate the user/company/customer context since RefreshDatabase resets each test
    $company = Company::create([
        'name' => 'Test Company',
        'company_code' => 'COMP001',
        'email' => 'company@example.com',
        'password' => bcrypt('password'),
    ]);
    $user = User::create([
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'company_code' => 'COMP001',
        'role_id' => 1,
        'user_type' => 'super_admin',
    ]);
    $accMas = AccMas::create([
        'AccCd' => 'CUS001',
        'AccNm' => 'Test Customer',
        'CurBal' => 1000.00,
        'company_code' => 'COMP001',
        'section_code' => 'SEC001',
    ]);
    $address = Address::create([
        'AccKy' => $accMas->AccKy,
        'AdrCd' => 'CUS001',
        'FstNm' => 'John',
        'LstNm' => 'Doe',
    ]);

    // create a bank account that will be selectable
    $bank = \App\Models\BankAccount::create([
        'account_name' => 'Company Account',
        'account_number' => 'ACC123',
        'bank_name' => 'Test Bank',
        'branch_name' => 'Main Branch',
        'account_type' => 'savings',
        'opening_balance' => 0,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'COMP001',
        'section_code' => 'SEC001',
        'current_balance' => 0,
        'created_by' => $user->id,
    ]);

    $this->actingAs($user);

    $response = $this->post('/admin/customer-payments', [
        'customer_id'      => $address->AdrKy,
        'payment_method'   => 'cheque',
        'amount'           => 250.00,
        'payment_date'     => '2023-10-02',
        'selected_bank_id' => $bank->id,
        'cheque_no'        => '654321',
        'cheque_date'      => '2023-10-02',
        'notes'            => 'Using dropdown bank',
    ]);

    $response->assertStatus(200);
    $response->assertJson(['success' => true]);
    expect(DB::table('customer_payments')->where([
        'customer_id' => $address->AdrKy,
        'amount' => 250.00,
        'method' => 'cheque',
        'cheque_no' => '654321',
        'bank_name' => 'Test Bank',
        'branch' => 'Main Branch',
    ])->exists())->toBeTrue();
});


test('bank account balance is incremented when payment uses selected bank', function () {
    $company = Company::create([
        'name' => 'Test Company',
        'company_code' => 'COMP001',
        'email' => 'company@example.com',
        'password' => bcrypt('password'),
    ]);
    $user = User::create([
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'company_code' => 'COMP001',
        'role_id' => 1,
        'user_type' => 'super_admin',
    ]);
    $accMas = AccMas::create([
        'AccCd' => 'CUS001',
        'AccNm' => 'Test Customer',
        'CurBal' => 1000.00,
        'company_code' => 'COMP001',
        'section_code' => 'SEC001',
    ]);
    $address = Address::create([
        'AccKy' => $accMas->AccKy,
        'AdrCd' => 'CUS001',
        'FstNm' => 'John',
        'LstNm' => 'Doe',
    ]);

    $bank = \App\Models\BankAccount::create([
        'account_name' => 'Company Account',
        'account_number' => 'ACC123',
        'bank_name' => 'Test Bank',
        'branch_name' => 'Main Branch',
        'account_type' => 'savings',
        'opening_balance' => 100.00,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'COMP001',
        'section_code' => 'SEC001',
        'current_balance' => 100.00,
        'created_by' => $user->id,
    ]);

    $this->actingAs($user);

    $response = $this->post('/admin/customer-payments', [
        'customer_id'      => $address->AdrKy,
        'payment_method'   => 'cheque',
        'amount'           => 250.00,
        'payment_date'     => '2023-10-02',
        'selected_bank_id' => $bank->id,
        'cheque_no'        => '654321',
        'cheque_date'      => '2023-10-02',
        'notes'            => 'Using dropdown bank',
    ]);

    $response->assertStatus(200);
    $response->assertJson(['success' => true]);

    $bank->refresh();
    expect((float)$bank->current_balance)->toBe(350.00); // 100 + 250
});


test('bank account balance increases on bank transfer payment', function () {
    $company = Company::create([
        'name' => 'Test Company',
        'company_code' => 'COMP001',
        'email' => 'company@example.com',
        'password' => bcrypt('password'),
    ]);
    $user = User::create([
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'company_code' => 'COMP001',
        'role_id' => 1,
        'user_type' => 'super_admin',
    ]);
    $accMas = AccMas::create([
        'AccCd' => 'CUS001',
        'AccNm' => 'Test Customer',
        'CurBal' => 1000.00,
        'company_code' => 'COMP001',
        'section_code' => 'SEC001',
    ]);
    $address = Address::create([
        'AccKy' => $accMas->AccKy,
        'AdrCd' => 'CUS001',
        'FstNm' => 'John',
        'LstNm' => 'Doe',
    ]);

    $bank = \App\Models\BankAccount::create([
        'account_name' => 'Company Account',
        'account_number' => 'ACC123',
        'bank_name' => 'Test Bank',
        'branch_name' => 'Main Branch',
        'account_type' => 'savings',
        'opening_balance' => 200.00,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'COMP001',
        'section_code' => 'SEC001',
        'current_balance' => 200.00,
        'created_by' => $user->id,
    ]);

    $this->actingAs($user);

    $response = $this->post('/admin/customer-payments', [
        'customer_id'      => $address->AdrKy,
        'payment_method'   => 'bank_transfer',
        'amount'           => 400.00,
        'payment_date'     => '2023-10-03',
        'selected_bank_id' => $bank->id,
        'Reference'        => 'REF123',
        'transfer_date'    => '2023-10-03',
        'notes'            => 'Bank transfer',
    ]);

    $response->assertStatus(200);
    $response->assertJson(['success' => true]);

    $bank->refresh();
    expect((float)$bank->current_balance)->toBe(600.00); // 200 + 400
});