<?php

namespace Database\Factories;

use App\Models\DeliveryPayment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DeliveryPayment>
 */
class DeliveryPaymentFactory extends Factory
{
    protected $model = DeliveryPayment::class;

    public function definition(): array
    {
        return [
            'delivery_id' => null, // override in tests
            'amount' => fake()->randomFloat(2, 10, 1000),
            'method' => fake()->randomElement(['cash', 'cheque', 'transfer']),
            'payment_date' => now()->format('Y-m-d'),
            'company_code' => null, // override or fall back to delivery
        ];
    }
}
