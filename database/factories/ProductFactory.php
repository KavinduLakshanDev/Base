<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'ItmKy' => fake()->unique()->numberBetween(1000, 9999),
            'ItemCode' => fake()->unique()->regexify('ITM[0-9]{4}'),
            'ItmNm' => fake()->words(3, true),
            'company_code' => fake()->regexify('[A-Z]{3}[0-9]{3}'),
            'section_code' => fake()->regexify('[A-Z]{2}[0-9]{3}'),
            'CosPri' => fake()->randomFloat(2, 10, 1000), // Use CosPri instead of cost_price
            'fInAct' => 1,
            'Status' => 1,
        ];
    }
}