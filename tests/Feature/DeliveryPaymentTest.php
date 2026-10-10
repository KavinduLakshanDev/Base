<?php

use App\Models\Company;
use App\Models\Delivery;
use App\Models\DeliveryItem;
use App\Models\DeliveryPayment;
use App\Models\DeliveryRoute;
use App\Models\Section;
use App\Models\StockInHand;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDeliveryWorld(): array
{
    $company = Company::create([
        'company_code' => 'PAY001',
        'name'         => 'Pay Test Co',
        'address'      => '1 Street',
        'phone'        => '0700000000',
        'email'        => 'pay@example.com',
        'password'     => bcrypt('password'),
        'is_active'    => true,
    ]);

    $user = User::create([
        'company_code' => 'PAY001',
        'first_name'   => 'Pay',
        'last_name'    => 'User',
        'email'        => 'payuser@example.com',
        'password'     => bcrypt('password'),
        'user_type'    => 'super_admin',
        'is_active'    => true,
    ]);

    $route = DeliveryRoute::create([
        'company_code' => 'PAY001',
        'name'         => 'Pay Route',
        'is_active'    => true,
    ]);

    $delivery = Delivery::create([
        'delivery_number'   => 'DEL-0000099',
        'delivery_route_id' => $route->id,
        'assigned_user_id'  => $user->id,
        'company_code'      => 'PAY001',
        'customer_name'     => 'Jane Doe',
        'customer_address'  => '2 Lane',
        'customer_phone'    => '0711111111',
        'delivery_date'     => now()->toDateString(),
        'status'            => 'delivered',
    ]);

    DeliveryItem::create([
        'delivery_id'  => $delivery->id,
        'ItmKy'        => 'ITM-PAY-1',
        'batch_no'     => 'B001',
        'section_code' => 'MAIN',
        'ItemCode'     => 'P001',
        'ItemName'     => 'Item One',
        'Unit'         => 'pcs',
        'quantity'     => 10,
        'unit_price'   => 100.00,
        'total_amount' => 1000.00,
    ]);

    return compact('user', 'delivery');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('can record a cash payment against a delivery', function () {
    ['user' => $user, 'delivery' => $delivery] = makeDeliveryWorld();

    $response = $this->actingAs($user)
        ->post("/deliveries/{$delivery->id}/payments", [
            'amount'       => 500.00,
            'method'       => 'cash',
            'payment_date' => now()->toDateString(),
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('delivery_payments', [
        'delivery_id' => $delivery->id,
        'amount'      => 500.00,
        'method'      => 'cash',
        'company_code'=> 'PAY001',
    ]);
});

test('cannot overpay a delivery', function () {
    ['user' => $user, 'delivery' => $delivery] = makeDeliveryWorld();

    // Delivery total is 1000; try to pay 1500
    $response = $this->actingAs($user)
        ->post("/deliveries/{$delivery->id}/payments", [
            'amount'       => 1500.00,
            'method'       => 'cash',
            'payment_date' => now()->toDateString(),
        ]);

    $response->assertSessionHasErrors('amount');
    $this->assertDatabaseMissing('delivery_payments', ['delivery_id' => $delivery->id]);
});

test('delivery payment status changes from unpaid to partial to paid', function () {
    ['user' => $user, 'delivery' => $delivery] = makeDeliveryWorld();

    // Fresh delivery — should be unpaid
    $delivery->load(['items', 'payments']);
    expect($delivery->payment_status)->toBe('unpaid');

    // Partial payment
    DeliveryPayment::create([
        'delivery_id'  => $delivery->id,
        'amount'       => 400.00,
        'method'       => 'cash',
        'payment_date' => now()->toDateString(),
        'company_code' => 'PAY001',
    ]);

    $delivery->refresh()->load(['items', 'payments']);
    expect($delivery->payment_status)->toBe('partial');
    expect($delivery->outstanding_balance)->toBe(600.0);

    // Full payment
    DeliveryPayment::create([
        'delivery_id'  => $delivery->id,
        'amount'       => 600.00,
        'method'       => 'cash',
        'payment_date' => now()->toDateString(),
        'company_code' => 'PAY001',
    ]);

    $delivery->refresh()->load(['items', 'payments']);
    expect($delivery->payment_status)->toBe('paid');
    expect($delivery->outstanding_balance)->toBe(0.0);
});

test('can delete a delivery payment', function () {
    ['user' => $user, 'delivery' => $delivery] = makeDeliveryWorld();

    $payment = DeliveryPayment::create([
        'delivery_id'  => $delivery->id,
        'amount'       => 200.00,
        'method'       => 'cash',
        'payment_date' => now()->toDateString(),
        'company_code' => 'PAY001',
    ]);

    $response = $this->actingAs($user)
        ->delete("/deliveries/{$delivery->id}/payments/{$payment->id}");

    $response->assertRedirect();
    // Soft-deleted: row still exists but deleted_at is set
    $this->assertSoftDeleted('delivery_payments', ['id' => $payment->id]);
});

test('payment receipt page renders', function () {
    ['user' => $user, 'delivery' => $delivery] = makeDeliveryWorld();

    $payment = DeliveryPayment::create([
        'delivery_id'  => $delivery->id,
        'amount'       => 300.00,
        'method'       => 'cheque',
        'reference_no' => 'CHQ-001',
        'bank_name'    => 'Test Bank',
        'payment_date' => now()->toDateString(),
        'company_code' => 'PAY001',
        'recorded_by'  => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get("/deliveries/{$delivery->id}/payments/{$payment->id}/receipt");

    $response->assertOk();
    $response->assertSee('CHQ-001');
    $response->assertSee('300');
});
