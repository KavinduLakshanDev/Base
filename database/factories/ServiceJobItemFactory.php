<?php

namespace Database\Factories;

use App\Models\ServiceJobItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServiceJobItemFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = ServiceJobItem::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'item_type' => 'service_charge',
            'item_code' => 'SERV-' . $this->faker->unique()->randomNumber(4),
            'item_name' => $this->faker->words(3, true),
            'quantity' => 1,
            'unit_price' => $this->faker->randomFloat(2, 50, 500),
            'cost_price' => $this->faker->randomFloat(2, 20, 200),
        ];
    }
}
