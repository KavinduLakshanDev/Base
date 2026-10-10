<?php

use App\Models\ServiceJob;
use App\Models\AccMas;
use App\Models\User;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ServiceJobDuplicateDeviceTest extends TestCase
{
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a super admin user for testing
        $this->user = User::factory()->create([
            'is_active' => true,
            'user_type' => 'super_admin',
        ]);
    }

    protected function tearDown(): void
    {
        // Clean up test data
        ServiceJob::where('job_number', 'like', 'SJ-TEST-%')->delete();
        AccMas::where('AccCd', 'like', 'TEST%')->delete();
        User::where('email', 'like', '%@test.com')->delete();

        parent::tearDown();
    }

    public function test_prevents_duplicate_service_job_for_same_device()
    {
        $this->actingAs($this->user);

        // Create a test customer
        $customer = AccMas::create([
            'AccCd' => 'TEST001',
            'AccNm' => 'Test Customer',
            'AccTyp' => 'CUSTOMER',
            'CurBal' => 0,
            'CrLmt' => 1000,
        ]);

        // Create a test technician (use a unique email to avoid collisions)
        $technician = User::create([
            'first_name' => 'Test',
            'last_name' => 'Technician',
            'email' => 'tech+' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        // Create first service job for a device
        $firstJob = ServiceJob::create([
            'job_number' => 'SJ-TEST-001-' . uniqid(),
            'AccKy' => $customer->AccKy,
            'customer_name' => $customer->AccNm,
            'customer_phone' => '0712345678',
            'device_serial' => 'SERIAL123',
            'device_brand' => 'Samsung',
            'device_model' => 'Galaxy S21',
            'problem_description' => 'Screen cracked',
            'received_date' => now(),
            'status' => 'pending',
            'assigned_technician_id' => $technician->id,
        ]);

        // Attempt to create second service job for same device
        $response = $this->post('/service-jobs', [
            'AccKy' => $customer->AccKy,
            'customer_name' => $customer->AccNm,
            'customer_phone' => '0712345678',
            'device_serial' => 'SERIAL123', // Same serial number
            'device_brand' => 'Samsung',
            'device_model' => 'Galaxy S21',
            'problem_description' => 'Battery issue',
            'received_date' => now()->format('Y-m-d'),
            'items' => '[]',
            'is_existing_customer' => '1',
        ]);

        // Should redirect back with validation errors
        $response->assertRedirect();
        $response->assertSessionHasErrors(['device_serial', 'device_barcode']);

        // Verify the error message is present
        $errors = session('errors');
        $this->assertStringContainsString('already under service', $errors->first('device_serial'));
    }

    public function test_prevents_duplicate_service_job_for_completed_undelivered_device()
    {
        $this->actingAs($this->user);

        // Create a test customer
        $customer = AccMas::create([
            'AccCd' => 'TEST002',
            'AccNm' => 'Test Customer 2',
            'AccTyp' => 'CUSTOMER',
            'CurBal' => 0,
            'CrLmt' => 1000,
        ]);

        // Create first service job and mark as completed but not delivered
        $deviceSerial = 'SERIAL-COMPLETED-' . uniqid();
        $completedJob = ServiceJob::create([
            'job_number' => 'SJ-TEST-002-' . uniqid(),
            'AccKy' => $customer->AccKy,
            'customer_name' => $customer->AccNm,
            'customer_phone' => '0712345678',
            'device_serial' => $deviceSerial,
            'device_brand' => 'Apple',
            'device_model' => 'iPhone 12',
            'problem_description' => 'Screen cracked',
            'received_date' => now(),
            'status' => 'completed',
            'actual_completion_date' => now(),
        ]);

        // Attempt to create another service job for the same device
        $response = $this->post('/service-jobs', [
            'AccKy' => $customer->AccKy,
            'customer_name' => $customer->AccNm,
            'customer_phone' => '0712345678',
            'device_serial' => $deviceSerial,
            'device_brand' => 'Apple',
            'device_model' => 'iPhone 12',
            'problem_description' => 'Battery issue',
            'received_date' => now()->format('Y-m-d'),
            'items' => '[]',
            'is_existing_customer' => '1',
        ]);

        $response->assertRedirect();
        $response->assertSessionHasErrors(['device_serial', 'device_barcode']);

        $errors = session('errors');
        $this->assertStringContainsString('not yet been delivered', $errors->first('device_serial'));
    }

    public function test_allows_service_job_after_previous_job_is_delivered()
    {
        $this->actingAs($this->user);

        $customer = AccMas::create([
            'AccCd' => 'TEST002A',
            'AccNm' => 'Test Customer 2A',
            'AccTyp' => 'CUSTOMER',
            'CurBal' => 0,
            'CrLmt' => 1000,
        ]);

        ServiceJob::create([
            'job_number' => 'SJ-TEST-002A-' . uniqid(),
            'AccKy' => $customer->AccKy,
            'customer_name' => $customer->AccNm,
            'customer_phone' => '0712345678',
            'device_serial' => 'SERIAL456A',
            'device_brand' => 'Apple',
            'device_model' => 'iPhone 12',
            'problem_description' => 'Screen cracked',
            'received_date' => now(),
            'status' => 'completed',
            'actual_completion_date' => now(),
            'delivered_date' => now()->toDateString(),
        ]);

        $response = $this->post('/service-jobs', [
            'AccKy' => $customer->AccKy,
            'customer_name' => $customer->AccNm,
            'customer_phone' => '0712345678',
            'device_serial' => 'SERIAL456A',
            'device_brand' => 'Apple',
            'device_model' => 'iPhone 12',
            'problem_description' => 'Battery issue',
            'received_date' => now()->format('Y-m-d'),
            'items' => '[]',
            'is_existing_customer' => '1',
        ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('service_jobs', [
            'device_serial' => 'SERIAL456A',
            'status' => 'pending',
            'problem_description' => 'Battery issue',
        ]);
    }

    public function test_sets_delivered_date_when_job_is_delivered()
    {
        Carbon::setTestNow('2026-04-07 10:00:00');
        $this->actingAs($this->user);

        $customer = AccMas::create([
            'AccCd' => 'TEST005',
            'AccNm' => 'Delivery Test Customer',
            'AccTyp' => 'CUSTOMER',
            'CurBal' => 0,
            'CrLmt' => 1000,
        ]);

        $job = ServiceJob::create([
            'job_number' => 'SJ-TEST-005-' . uniqid(),
            'AccKy' => $customer->AccKy,
            'customer_name' => $customer->AccNm,
            'customer_phone' => '0712345678',
            'device_serial' => 'SERIAL555',
            'device_brand' => 'TestBrand',
            'device_model' => 'TestModel',
            'problem_description' => 'Battery issue',
            'received_date' => '2026-04-02',
            'status' => 'completed',
            'actual_completion_date' => '2026-04-02',
        ]);

        $response = $this->post('/service-jobs/' . $job->id . '/update-status', [
            'status' => 'delivered',
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('service_jobs', [
            'id' => $job->id,
            'status' => 'delivered',
            'actual_completion_date' => '2026-04-02',
            'delivered_date' => Carbon::now()->toDateString(),
        ]);

        Carbon::setTestNow();
    }

    public function test_existing_customer_phone_is_updated_when_provided()
    {
        $this->actingAs($this->user);

        // create a customer without any phone/address record
        $customer = AccMas::create([
            'AccCd' => 'TEST004',
            'AccNm' => 'Phone Update Customer',
            'AccTyp' => 'CUSTOMER',
            'CurBal' => 0,
            'CrLmt' => 1000,
        ]);

        // make sure there is no address yet
        $this->assertDatabaseMissing('address', ['AccKy' => $customer->AccKy]);

        // create a technician
        $technician = User::factory()->create([
            'first_name' => 'Tech',
            'last_name' => 'User',
            'is_active' => true,
        ]);

        // submit service job with a phone number (use a unique serial to avoid pre-existing data)
        $serial = 'TEST-SERIAL-' . uniqid();

        $response = $this->post('/service-jobs', [
            'AccKy' => $customer->AccKy,
            'customer_name' => $customer->AccNm,
            'customer_phone' => '0770000000',
            'device_serial' => $serial,
            'device_brand' => 'TestBrand',
            'device_model' => 'TestModel',
            'problem_description' => 'No phone provided earlier',
            'received_date' => now()->format('Y-m-d'),
            'items' => '[]',
            'is_existing_customer' => '1',
        ]);

        $response->assertRedirect();

        // address record should be created/updated with the phone
        $this->assertDatabaseHas('address', [
            'AccKy' => $customer->AccKy,
            'TP1' => '0770000000',
        ]);
    }

    public function test_get_customer_by_device_returns_error_for_active_service()
    {
        $this->actingAs($this->user);

        // Create a test customer
        $customer = AccMas::create([
            'AccCd' => 'TEST003',
            'AccNm' => 'Test Customer 3',
            'AccTyp' => 'CUSTOMER',
            'CurBal' => 0,
            'CrLmt' => 1000,
        ]);

        // Create active service job
        $activeJob = ServiceJob::create([
            'job_number' => 'SJ-TEST-003-' . uniqid(),
            'AccKy' => $customer->AccKy,
            'customer_name' => $customer->AccNm,
            'customer_phone' => '0712345678',
            'device_serial' => 'SERIAL789',
            'device_brand' => 'Samsung',
            'device_model' => 'Galaxy Note 20',
            'problem_description' => 'Charging port issue',
            'received_date' => now(),
            'status' => 'in_progress',
        ]);

        // Try to get customer by device serial
        $response = $this->get('/service-jobs/get-customer-by-device?serial=SERIAL789');

        // Should return 409 Conflict with error details
        $response->assertStatus(409);
        $response->assertJsonFragment([
            'error' => 'Device already under service',
            'message' => 'This device is already under service and cannot be registered for a new service job.',
            'device_serial' => 'SERIAL789',
        ]);
        $this->assertEquals('in_progress', $response->json('existing_job.status'));
        $this->assertEquals('Test Customer 3', $response->json('existing_job.customer_name'));
    }

    public function test_blocks_get_customer_by_device_for_completed_undelivered_device()
    {
        $this->actingAs($this->user);

        $customer = AccMas::create([
            'AccCd' => 'TEST006',
            'AccNm' => 'Completed Customer',
            'AccTyp' => 'CUSTOMER',
            'CurBal' => 0,
            'CrLmt' => 1000,
        ]);

        $completedJob = ServiceJob::create([
            'job_number' => 'SJ-TEST-006-' . uniqid(),
            'AccKy' => $customer->AccKy,
            'customer_name' => $customer->AccNm,
            'customer_phone' => '0771234567',
            'device_serial' => 'SERIAL999',
            'device_brand' => 'LG',
            'device_model' => 'Gram',
            'problem_description' => 'Screen issue',
            'received_date' => now()->subDays(5),
            'status' => 'completed',
            'actual_completion_date' => now()->subDays(1)->toDateString(),
        ]);

        $response = $this->get('/service-jobs/get-customer-by-device?serial=SERIAL999');

        $response->assertStatus(409);
        $response->assertJsonFragment([
            'error' => 'Device already under service',
            'message' => 'This device already has a completed service job that has not yet been delivered and cannot be registered for a new service job.',
            'device_serial' => 'SERIAL999',
        ]);
        $this->assertEquals('completed', $response->json('existing_job.status'));
    }
}
