<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\CustomerPayment;
use App\Models\Customer;
use App\Models\AccMas;
use App\Models\Address;
use App\Models\SalesTransaction;
use App\Models\ServiceJob;
use App\Http\Controllers\Admin\CustomerPaymentController;

class CustomerPaymentReceiptTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * Balance should be taken from AccMas when payment is not tied to sale/job.
     */
    public function test_resolve_balance_uses_account_when_unlinked()
    {
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user);

        // create customer/account
        $acc = AccMas::create([
            'AccKy' => 500,
            'AccCd' => 'CUST500',
            'AccNm' => 'Test Acc',
            'CurBal' => 1234.56,
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);
        $addr = Address::create([
            'AdrKy' => 600,
            'AccKy' => $acc->AccKy,
            'FstNm' => 'Foo',
            'LstNm' => 'Bar',
            'AdrCd' => 'CUSABC',
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);

        $payment = CustomerPayment::create([
            'customer_id' => $addr->AdrKy,
            'customer_code' => $acc->AccCd,
            'amount' => 100,
            'date' => now(),
            'method' => 'cash',
            'status' => 'completed',
        ]);

        $controller = new CustomerPaymentController();
        $balance = $controller->resolveReceiptBalance($payment);
        $this->assertEquals(1234.56, $balance);
    }

    /**
     * When a payment is linked to a sale the sale's balance should be shown.
     */
    public function test_resolve_balance_prefers_sale_balance()
    {
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user);

        $sale = SalesTransaction::create([
            'customer_id' => 1,
            'transaction_date' => now(),
            'total_amount' => 200,
            'balance_amount' => 37.50,
            'status' => 'partially_paid',
            'invoice_no' => 'TESTINV001',
        ]);

        // create address record that will satisfy customer_id
        $addr2 = Address::create([
            'AdrKy' => 700,
            'AccKy' => null,
            'FstNm' => 'Sale',
            'LstNm' => 'Cust',
            'AdrCd' => 'SALECUST',
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);
        $payment = CustomerPayment::create([
            'customer_id' => $addr2->AdrKy,
            'customer_code' => null,
            'sales_transaction_id' => $sale->id,
            'amount' => 50,
            'date' => now(),
            'method' => 'cash',
            'status' => 'completed',
        ]);

        $controller = new CustomerPaymentController();
        $balance = $controller->resolveReceiptBalance($payment);
        $this->assertEquals(37.50, $balance);
    }

    /**
     * When a payment is linked to a service job the job's balance is used.
     */
    public function test_resolve_balance_prefers_job_balance()
    {
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user);

        $job = ServiceJob::create([
            'AccKy' => 1,
            'total_amount' => 500,
            'paid_amount' => 100,
            'balance_amount' => 400,
            'status' => 'pending',
            'problem_description' => 'Test issue',
            'job_number' => 'SJ-TEST-1',
            'received_date' => now(),
        ]);

        // create a dummy address for payment
        $addr3 = Address::create([
            'AdrKy' => 800,
            'AccKy' => null,
            'FstNm' => 'Job',
            'LstNm' => 'Cust',
            'AdrCd' => 'JOBCUST',
            'company_code' => 'TEST',
            'section_code' => 'MAIN',
        ]);
        $payment = CustomerPayment::create([
            'customer_id' => $addr3->AdrKy,
            'customer_code' => null,
            'service_job_id' => $job->id,
            'amount' => 100,
            'date' => now(),
            'method' => 'cash',
            'status' => 'completed',
        ]);

        $controller = new CustomerPaymentController();
        $balance = $controller->resolveReceiptBalance($payment);
        $this->assertEquals(400, $balance);
    }
}
