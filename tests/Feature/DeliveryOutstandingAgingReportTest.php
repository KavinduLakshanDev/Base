<?php

use App\Models\Delivery;
use App\Models\DeliveryPayment;
use App\Models\User;
use App\Models\Shop;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Inertia\Testing\AssertableInertia as Assert;

uses(DatabaseTransactions::class);

test('delivery outstanding aging report classifies buckets and flags critical overdue + CSV', function () {
    $this->seed();

    $user = User::factory()->create();
    $this->actingAs($user);

    // Delivery in 0-30 (today) - partially paid
    $d1 = Delivery::factory()->create(['delivery_date' => now()->toDateString(), 'company_code' => $user->company_code]);
    DeliveryPayment::factory()->create(['delivery_id' => $d1->id, 'amount' => max(0, $d1->total_amount - 100), 'payment_date' => now()->toDateString(), 'company_code' => $user->company_code]);

    // Delivery in 31-60 (40 days ago) - unpaid
    $d2 = Delivery::factory()->create(['delivery_date' => now()->subDays(40)->toDateString(), 'company_code' => $user->company_code]);

    // Delivery in 61-90 (75 days ago) - unpaid (critical overdue)
    $d3 = Delivery::factory()->create(['delivery_date' => now()->subDays(75)->toDateString(), 'company_code' => $user->company_code]);

    $response = $this->get('/reports/delivery-outstanding');
    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Reports/DeliveryOutstandingAging')
        ->has('company')
        ->where('company.name', $user->company->name)
        ->has('deliveries', 3)
        ->where('bucket_totals.2.label', '61-90')
        ->where('bucket_totals.2.count', 1)
        ->where('summary.total_outstanding', fn ($v) => is_numeric($v) && $v > 0)
        // ensure dates are normalized to Y-m-d (no T00:00:00.000000Z suffix)
        ->where('deliveries.0.delivery_date', fn ($v) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) === 1)
        ->where('deliveries.1.delivery_date', fn ($v) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) === 1)
        ->where('deliveries.2.delivery_date', fn ($v) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) === 1)
        ->where('deliveries.0.age', fn ($v) => preg_match('/^\d+d \d+h \d+m$/', $v) === 1)
        ->where('deliveries.1.age', fn ($v) => preg_match('/^\d+d \d+h \d+m$/', $v) === 1)
        ->where('deliveries.2.age', fn ($v) => preg_match('/^\d+d \d+h \d+m$/', $v) === 1)
    );

    // CSV export contains bucket column and currency prefix
    $csv = $this->get('/reports/delivery-outstanding/export');
    $csv->assertStatus(200);
    $csv->assertSee('bucket', false);
    $csv->assertSee('Rs.');
});

test('send reminder endpoint calls SmsService and returns success', function () {
    $this->seed();

    $user = User::factory()->create();
    $this->actingAs($user);

    $delivery = Delivery::factory()->create(['delivery_date' => now()->subDays(75)->toDateString(), 'company_code' => $user->company_code, 'customer_phone' => '0771234567']);

    // Bind a fake SmsService
    app()->instance(\App\Services\SmsService::class, new class {
        public function sendSms($phone, $message, $referenceId = null, $referenceType = null) {
            return ['success' => true, 'message' => 'Simulated SMS'];
        }
    });

    $resp = $this->post("/reports/delivery-outstanding/{$delivery->id}/send-reminder");
    $resp->assertStatus(200);
    $resp->assertJson(['success' => true]);
});


test('send reminder surfaces provider error (No recipients found) and returns 422', function () {
    $this->seed();

    $user = User::factory()->create();
    $this->actingAs($user);

    $delivery = Delivery::factory()->create(['delivery_date' => now()->subDays(75)->toDateString(), 'company_code' => $user->company_code, 'customer_phone' => '0771234567']);

    // Simulate provider returning "No recipients found"
    app()->instance(\App\Services\SmsService::class, new class {
        public function sendSms($phone, $message, $referenceId = null, $referenceType = null) {
            return ['success' => false, 'message' => 'No recipients found'];
        }
    });

    $resp = $this->post("/reports/delivery-outstanding/{$delivery->id}/send-reminder");
    $resp->assertStatus(422);
    $resp->assertJson(['success' => false, 'message' => 'No recipients found']);
});


test('send reminder accepts and normalizes common phone formats', function () {
    $this->seed();

    $user = User::factory()->create();
    $this->actingAs($user);

    // use simulated provider so sendSms runs without external HTTP
    config(['sms.default_provider' => 'simulated']);

    $examples = [
        '0094 77 1234567',
        '+94-77-123-4567',
        '0771234567',
        '771234567',
        '94771234567',
    ];

    foreach ($examples as $phone) {
        $delivery = Delivery::factory()->create(['delivery_date' => now()->subDays(10)->toDateString(), 'company_code' => $user->company_code, 'customer_phone' => $phone]);

        $resp = $this->post("/reports/delivery-outstanding/{$delivery->id}/send-reminder");
        $resp->assertStatus(200);

        // sms log should contain normalized '94' + 9 digits
        $this->assertDatabaseHas('sms_logs', ['reference_id' => $delivery->delivery_number, 'company_code' => $user->company_code]);
    }
});


test('send reminder falls back to shop contact phone when delivery phone invalid', function () {
    $this->seed();

    $user = User::factory()->create();
    $this->actingAs($user);

    config(['sms.default_provider' => 'simulated']);

    $shop = Shop::create(['company_code' => $user->company_code, 'name' => 'Fallback Shop', 'contact_phone' => '0775550000']);

    $delivery = Delivery::factory()->create(['company_code' => $user->company_code, 'shop_id' => $shop->id, 'customer_phone' => 'INVALID_PHONE']);

    $resp = $this->post("/reports/delivery-outstanding/{$delivery->id}/send-reminder");
    $resp->assertStatus(200);

    // sms log should have shop phone normalized
    $this->assertDatabaseHas('sms_logs', ['phone_number' => '94775550000', 'reference_id' => $delivery->delivery_number]);
});


test('delivery outstanding aging report can be filtered by customer (shop and phone) and shows paid deliveries for selected customer', function () {
    $this->seed();

    $user = User::factory()->create();
    $this->actingAs($user);

    // shop-backed delivery (outstanding)
    $shop = Shop::create(['company_code' => $user->company_code, 'name' => 'Filter Shop', 'contact_phone' => '0775550000']);
    $dShop = Delivery::factory()->create(['shop_id' => $shop->id, 'company_code' => $user->company_code, 'delivery_date' => now()->subDays(10)->toDateString()]);

    // shop-backed delivery (fully paid)
    $dPaid = Delivery::factory()->create(['shop_id' => $shop->id, 'company_code' => $user->company_code, 'delivery_date' => now()->subDays(5)->toDateString()]);
    \App\Models\DeliveryPayment::factory()->create(['delivery_id' => $dPaid->id, 'amount' => $dPaid->total_amount, 'payment_date' => now()->toDateString(), 'company_code' => $user->company_code]);

    // delivery-only customer by phone (outstanding)
    $dOther = Delivery::factory()->create(['company_code' => $user->company_code, 'customer_name' => 'Other Cust', 'customer_phone' => '0779990001', 'delivery_date' => now()->subDays(20)->toDateString()]);

    // When customer filter is applied for shop: show ALL deliveries for that shop (including paid)
    $resp1 = $this->get('/reports/delivery-outstanding?customer_id=' . urlencode('shop:' . $shop->id));
    $resp1->assertStatus(200);
    $resp1->assertInertia(fn (Assert $page) => $page->has('deliveries', 2));
    $this->assertStringContainsString($dPaid->delivery_number, $resp1->getContent());

    // By default (no customer filter) only outstanding deliveries are shown — the fully paid one should NOT appear
    $respAll = $this->get('/reports/delivery-outstanding');
    $respAll->assertStatus(200);
    $this->assertStringNotContainsString($dPaid->delivery_number, $respAll->getContent());

    // phone-based selection still works
    $resp2 = $this->get('/reports/delivery-outstanding?customer_id=' . urlencode('0779990001'));
    $resp2->assertStatus(200);
    $resp2->assertInertia(fn (Assert $page) => $page->has('deliveries', 1)->where('deliveries.0.customer_name', 'Other Cust'));

    // CSV export for the shop should include both deliveries
    $csvResp = $this->get('/reports/delivery-outstanding/export?customer_id=' . urlencode('shop:' . $shop->id));
    $csvResp->assertStatus(200);
    $csvResp->assertSee($dPaid->delivery_number);

    // ensure customers dropdown contains the shop name
    $this->assertStringContainsString('Filter Shop', $resp1->getContent());
});


test('shop selection returns deliveries linked by shop_id and those with matching customer_name', function () {
    $this->seed();

    $user = User::factory()->create();
    $this->actingAs($user);

    $shop = Shop::create(['company_code' => $user->company_code, 'name' => 'Shan Store', 'contact_phone' => '0777000000']);

    // delivery linked to shop table
    $d1 = Delivery::factory()->create(['company_code' => $user->company_code, 'shop_id' => $shop->id, 'delivery_number' => 'DEL-0000001', 'delivery_date' => now()->toDateString()]);

    // delivery created earlier without shop_id but same customer name
    $d2 = Delivery::factory()->create(['company_code' => $user->company_code, 'shop_id' => null, 'customer_name' => 'Shan Store', 'delivery_number' => 'DEL-0000002', 'delivery_date' => now()->toDateString()]);

    $resp = $this->actingAs($user)->get('/reports/delivery-outstanding?customer_id=' . urlencode('shop:' . $shop->id));
    $resp->assertStatus(200);
    $resp->assertInertia(fn (Assert $page) => $page->has('deliveries', 2));
    $this->assertStringContainsString('DEL-0000001', $resp->getContent());
    $this->assertStringContainsString('DEL-0000002', $resp->getContent());
});