<?php

namespace Database\Factories;

use App\Models\SalesTransactionItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalesTransactionItemFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = SalesTransactionItem::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'invoice_no' => 'INV-' . $this->faker->unique()->randomNumber(6),
            'item_code' => 'ITM-' . $this->faker->unique()->randomNumber(4),
            'item_name' => $this->faker->words(3, true),
            'quantity' => $this->faker->numberBetween(1, 10),
            'unit_price' => $this->faker->randomFloat(2, 10, 100),
            'cost_price' => $this->faker->randomFloat(2, 5, 80),
            'unit' => 'PCS',
        ];
    }
}
