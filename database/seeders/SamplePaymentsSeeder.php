<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CustomerPayment;
use App\Models\Customer;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SamplePaymentsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get a customer to use for payments
        $customer = Customer::first();
        
        if (!$customer) {
            $this->command->error('No customers found in database. Please seed customers first.');
            return;
        }

        // Get a user to act as cashier/collector
        $user = User::first();
        
        if (!$user) {
            $this->command->error('No users found in database. Please seed users first.');
            return;
        }

        $this->command->info('Creating sample payment records...');

        // Create payments for last 30 days
        $paymentMethods = ['cash', 'cheque', 'bank', 'card'];
        $startDate = Carbon::now()->subDays(30);
        $endDate = Carbon::now();
        
        $paymentsCreated = 0;
        
        // Create 2-5 random payments per day
        $currentDate = $startDate->copy();
        while ($currentDate <= $endDate) {
            $paymentsToday = rand(2, 5);
            
            for ($i = 0; $i < $paymentsToday; $i++) {
                $method = $paymentMethods[array_rand($paymentMethods)];
                $amount = rand(500, 50000);
                
                CustomerPayment::create([
                    'customer_id' => $customer->AdrKy,
                    'customer_code' => $customer->AdrCd,
                    'collected_by' => $user->id,
                    'amount' => $amount,
                    'date' => $currentDate->format('Y-m-d'),
                    'method' => $method,
                    'reference' => $method === 'cheque' ? 'CHQ-' . rand(100000, 999999) : null,
                    'status' => 'completed',
                    'notes' => 'Sample payment for testing',
                ]);
                
                $paymentsCreated++;
            }
            
            $currentDate->addDay();
        }

        $this->command->info("Successfully created {$paymentsCreated} sample payment records.");
        $this->command->info("Date range: {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}");
    }
}
