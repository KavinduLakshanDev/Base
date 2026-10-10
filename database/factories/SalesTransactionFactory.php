<?php

namespace Database\Factories;

use App\Models\SalesTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class SalesTransactionFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = SalesTransaction::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'uuid' => $this->faker->uuid,
            'invoice_no' => 'INV-' . $this->faker->unique()->randomNumber(6),
            'transaction_date' => $this->faker->date(),
            'customer_code' => 'CUST-' . $this->faker->randomNumber(4),
            'customer_name' => $this->faker->name,
            'price_type' => 'retail',
            'section_code' => 'SEC-' . $this->faker->randomNumber(3),
            'cashier_id' => 1,
            'customer_id' => 1,
            'subtotal' => $this->faker->randomFloat(2, 100, 1000),
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => $this->faker->randomFloat(2, 100, 1000),
            'balance_amount' => 0,
            'vat_rate' => 0,
            'is_vat_invoice' => false,
            'payment_details' => [],
            'status' => 'completed',
            'notes' => $this->faker->sentence,
            'completed_at' => now(),
        ];
    }
}
