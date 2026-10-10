<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\User;
use App\Models\DayOpeningBalance;
use App\Models\SalesTransaction;
use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);

// verify that the cash-balance API returns the correct "sales" total rather
// than the raw cash field, which may include change.
test('cash-balance endpoint reports sale amounts not paid amounts', function () {
    $user = User::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
    ]);

    $this->actingAs($user);

    // opening balance of 10k for today
    DayOpeningBalance::create([
        'user_id' => $user->id,
        'balance_date' => now()->format('Y-m-d'),
        'opening_balance' => 10000,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'created_by' => $user->id,
    ]);

    // create a sale priced 3000 but customer paid 5000 (change 2000)
    SalesTransaction::create([
        'invoice_no' => 'INV-100',
        'transaction_date' => now()->format('Y-m-d'),
        'customer_id' => null,
        'cashier_id' => $user->id,
        'section_code' => 'SEC-A',
        'subtotal' => 3000,
        'total_amount' => 3000,
        'payment_details' => ['cash' => 5000],
        'status' => 'completed',
        'company_code' => 'C1',
    ]);

    $resp = $this->getJson('/sales/cash-balance');
    $resp->assertStatus(200)
        ->assertJson([
            'opening_balance' => 10000.0,
            'today_cash_sales' => 3000.0,
            'current_balance' => 13000.0,
            'has_opening' => true,
        ]);
});

// also ensure the create() page props use the same logic
// this verifies the Inertia payload is consistent

test('sales create page includes adjusted cash balance', function () {
    // create a user with super_admin type so the permission check in
    // SalesController::create always passes (avoids randomness in factory)
    $user = User::factory()->create([
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'user_type' => 'super_admin',
    ]);

    $this->actingAs($user);

    DayOpeningBalance::create([
        'user_id' => $user->id,
        'balance_date' => now()->format('Y-m-d'),
        'opening_balance' => 5000,
        'currency' => 'LKR',
        'status' => 'active',
        'company_code' => 'C1',
        'section_code' => 'SEC-A',
        'created_by' => $user->id,
    ]);

    SalesTransaction::create([
        'invoice_no' => 'INV-200',
        'transaction_date' => now()->format('Y-m-d'),
        'customer_id' => null,
        'cashier_id' => $user->id,
        'section_code' => 'SEC-A',
        'subtotal' => 1500,
        'total_amount' => 1500,
        'payment_details' => ['cash' => 2000],
        'status' => 'completed',
        'company_code' => 'C1',
    ]);

    $resp = $this->get('/sales/create');
    $resp->assertStatus(200);
    $resp->assertInertia(fn(Assert $page) =>
        $page->where('dayBalance.today_cash_sales', 1500)
             ->where('dayBalance.opening_balance', 5000)
             ->where('dayBalance.current_balance', 6500)
    );
});
