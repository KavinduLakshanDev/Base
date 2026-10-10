<?php

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use App\Models\Customer;
use App\Models\PrivilegeUser;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

it('creates a customer and optionally registers it as a privilege user', function () {
    // prepare company and main section
    $company = Company::factory()->create(['company_code' => 'TEST001']);
    $section = Section::factory()->create([
        'company_code' => 'TEST001',
        'is_active' => true,
        'is_main_stock' => true,
        'section_code' => 'SEC001',
    ]);

    // super admin user (bypasses permission checks)
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'TEST001',
    ]);

    $this->actingAs($user);

    // spy on log so we can confirm SMS send attempt
    Log::spy();

    $postData = [
        'FstNm' => 'Kavindu',
        'LstNm' => 'Tester',
        'Address' => '12 Example St',
        'TP1' => '0771234567',
        'Title' => 'Mr',
        'register_as_privilege' => true,
        'privilege_card_no' => 'CARD123',
    ];

    $response = $this->post(route('admin.customers.store'), $postData);
    $response->assertRedirect(route('admin.customers.index'));

    // customer should exist
    $this->assertDatabaseHas('address', [
        'FstNm' => 'Kavindu',
        'Address' => '12 Example St',
    ]);

    // privilege user record should have been created
    $this->assertDatabaseHas('privilege_users', [
        'card_no' => 'CARD123',
        'company_code' => 'TEST001',
    ]);

    // SMS logging is handled by the service; we don't assert on it here anymore.
});

it('fails when the privilege card number is already in use', function () {
    $company = Company::factory()->create(['company_code' => 'TEST002']);
    Section::factory()->create([
        'company_code' => 'TEST002',
        'is_active' => true,
        'is_main_stock' => true,
        'section_code' => 'SEC002',
    ]);

    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'TEST002',
    ]);
    $this->actingAs($user);

    // first registration
    $this->post(route('admin.customers.store'), [
        'FstNm' => 'Alice',
        'LstNm' => 'First',
        'Address' => '1 A St',
        'TP1' => '0770000001',
        'Title' => 'Ms',
        'register_as_privilege' => true,
        'privilege_card_no' => 'CARDXYZ',
    ])->assertRedirect(route('admin.customers.index'));

    // second attempt with same card
    $resp = $this->post(route('admin.customers.store'), [
        'FstNm' => 'Bob',
        'LstNm' => 'Second',
        'Address' => '2 B St',
        'TP1' => '0770000002',
        'Title' => 'Mr',
        'register_as_privilege' => true,
        'privilege_card_no' => 'CARDXYZ',
    ]);

    $resp->assertSessionHas('error');
    $this->assertStringContainsString('Privilege card number already in use', session('error'));
    // ensure second customer still not recorded as privilege user
    $this->assertDatabaseMissing('privilege_users', [
        'card_no' => 'CARDXYZ',
        'company_code' => 'TEST002',
        'privCusName' => 'Bob Second',
    ]);
});

it('can add privilege registration by editing existing customer', function () {
    $company = Company::factory()->create(['company_code' => 'TEST003']);
    $section = Section::factory()->create([
        'company_code' => 'TEST003',
        'is_active' => true,
        'is_main_stock' => true,
        'section_code' => 'SEC003',
    ]);
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'TEST003',
    ]);
    $this->actingAs($user);

    // create simple customer without priv
    $this->post(route('admin.customers.store'), [
        'FstNm' => 'Charlie',
        'LstNm' => 'Edit',
        'Address' => '3 C St',
        'TP1' => '0770000003',
        'Title' => 'Mr',
    ])->assertRedirect(route('admin.customers.index'));

    $customer = Customer::where('FstNm','Charlie')->first();
    expect($customer)->not->toBeNull();

    // now edit and register as privilege
    $resp = $this->put(route('admin.customers.update', $customer->AdrKy), [
        'FstNm' => 'Charlie',
        'LstNm' => 'Edit',
        'Address' => '3 C St',
        'TP1' => '0770000003',
        'Title' => 'Mr',
        'register_as_privilege' => true,
        'privilege_card_no' => 'CARDNEW',
    ]);
    $resp->assertRedirect(route('admin.customers.index'));

    $this->assertDatabaseHas('privilege_users', [
        'company_code' => 'TEST003',
        'card_no' => 'CARDNEW',
        'phone' => '0770000003',
    ]);
});

it('toggles a customer and keeps related privilege user active flag in sync', function () {
    $company = Company::factory()->create(['company_code' => 'TOGGLE1']);
    $section = Section::factory()->create([
        'company_code' => 'TOGGLE1',
        'is_active' => true,
        'is_main_stock' => true,
        'section_code' => 'SEC_TOGGLE',
    ]);
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'TOGGLE1',
    ]);
    $this->actingAs($user);

    // create customer with privilege registration
    $response = $this->post(route('admin.customers.store'), [
        'FstNm' => 'Toggle',
        'LstNm' => 'User',
        'Address' => '4 D St',
        'TP1' => '0710000004',
        'Title' => 'Ms',
        'register_as_privilege' => true,
        'privilege_card_no' => 'TGL123',
    ]);
    $response->assertRedirect(route('admin.customers.index'));

    $customer = Customer::where('TP1', '0710000004')->first();
    expect($customer)->not->toBeNull();

    $this->assertDatabaseHas('privilege_users', [
        'company_code' => 'TOGGLE1',
        'phone' => '0710000004',
        'is_active' => true,
    ]);

    // toggle off
    $this->post(route('admin.customers.toggle', $customer->AdrKy))
        ->assertRedirect();

    $customer->refresh();
    expect($customer->Status)->toEqual('I');

    $this->assertDatabaseHas('privilege_users', [
        'company_code' => 'TOGGLE1',
        'phone' => '0710000004',
        'is_active' => false,
        'finAct' => false,
    ]);

    // toggle back on
    $this->post(route('admin.customers.toggle', $customer->AdrKy))
        ->assertRedirect();

    $customer->refresh();
    expect($customer->Status)->toEqual('A');

    $this->assertDatabaseHas('privilege_users', [
        'company_code' => 'TOGGLE1',
        'phone' => '0710000004',
        'is_active' => true,
        'finAct' => true,
    ]);
});

it('updates privilege user active flag when status changed via edit form', function () {
    $company = Company::factory()->create(['company_code' => 'TOGGLE2']);
    $section = Section::factory()->create([
        'company_code' => 'TOGGLE2',
        'is_active' => true,
        'is_main_stock' => true,
        'section_code' => 'SEC_TGL2',
    ]);
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'TOGGLE2',
    ]);
    $this->actingAs($user);

    // create and privilege-register
    $this->post(route('admin.customers.store'), [
        'FstNm' => 'Edit',
        'LstNm' => 'Status',
        'Address' => '5 E St',
        'TP1' => '0710000005',
        'Title' => 'Mr',
        'register_as_privilege' => true,
        'privilege_card_no' => 'TGL456',
    ])->assertRedirect(route('admin.customers.index'));

    $customer = Customer::where('TP1', '0710000005')->first();
    expect($customer)->not->toBeNull();

    // now update status to inactive through edit
    $this->put(route('admin.customers.update', $customer->AdrKy), [
        'FstNm' => $customer->FstNm,
        'LstNm' => $customer->LstNm,
        'Address' => $customer->Address,
        'TP1' => $customer->TP1,
        'Title' => $customer->Title,
        'Status' => 'I',
    ])->assertRedirect(route('admin.customers.index'));

    $this->assertDatabaseHas('privilege_users', [
        'company_code' => 'TOGGLE2',
        'phone' => '0710000005',
        'is_active' => false,
        'finAct' => false,
    ]);
});

it('show page includes privilege-user flag', function () {
    $company = Company::factory()->create(['company_code' => 'SHOW1']);
    Section::factory()->create([
        'company_code' => 'SHOW1',
        'is_active' => true,
        'is_main_stock' => true,
        'section_code' => 'SEC_SHOW',
    ]);
    $user = User::factory()->create([
        'user_type' => 'super_admin',
        'company_code' => 'SHOW1',
    ]);
    $this->actingAs($user);

    // privileged customer
    $this->post(route('admin.customers.store'), [
        'FstNm' => 'Priv',
        'LstNm' => 'User',
        'Address' => '5 E St',
        'TP1' => '0779000005',
        'Title' => 'Mr',
        'register_as_privilege' => true,
        'privilege_card_no' => 'PRV5',
    ]);

    // ensure the customer record exists and phone field stored correctly
    $customer = Customer::where('TP1', '0779000005')->first();
    expect($customer)->not->toBeNull();

    // also check the privilege user row has the expected phone/company
    $this->assertDatabaseHas('privilege_users', [
        'company_code' => 'SHOW1',
        'card_no' => 'PRV5',
        'phone' => '0779000005',
    ]);

    // inspect response in log for debugging if something goes wrong
    $response = $this->get(route('admin.customers.show', $customer->AdrKy));
    Log::info('show page response status', ['status' => $response->status()]);
    Log::info('show page content', ['content' => $response->getContent()]);

    // manually inspect view data to avoid inertia macro quirks
    $page = $response->viewData('page');
    $this->assertArrayHasKey('customer', $page['props']);
    $this->assertTrue($page['props']['customer']['is_privilege']);
    $this->assertEquals('PRV5', $page['props']['customer']['privilege_card_no']);

    // non-privileged customer
    $this->post(route('admin.customers.store'), [
        'FstNm' => 'NonPriv',
        'LstNm' => 'User',
        'Address' => '6 F St',
        'TP1' => '0779000006',
        'Title' => 'Ms',
    ]);

    $customer2 = Customer::where('TP1', '0779000006')->first();
    $resp2 = $this->get(route('admin.customers.show', $customer2->AdrKy));
    $page2 = $resp2->viewData('page');
    $this->assertArrayHasKey('customer', $page2['props']);
    $this->assertFalse($page2['props']['customer']['is_privilege']);
    $this->assertNull($page2['props']['customer']['privilege_card_no']);
});
