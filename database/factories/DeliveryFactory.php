<?php

namespace Database\Factories;

use App\Models\Delivery;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Delivery>
 */
class DeliveryFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Delivery::class;

    /**
     * Define the model's default state.
     *
     * Populate the minimal required columns; tests can override whatever they
     * need explicitly (route, company_code etc).
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'delivery_number' => 'DLV-' . strtoupper(Str::random(6)),
            'delivery_route_id' => null, // test should provide when needed
            // 'distributor_id' column was removed from schema; don't set it
            'status' => 'pending',
            'company_code' => fake()->regexify('[A-Z]{3}[0-9]{2}'),
            'customer_name' => fake()->name(),
            'customer_address' => fake()->address(),
            'customer_phone' => fake()->numerify('0#########'),
            'delivery_date' => now()->format('Y-m-d'),
        ];
    }
}
