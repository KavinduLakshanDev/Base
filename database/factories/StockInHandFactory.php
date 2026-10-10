<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Product;
use App\Models\Section;
use App\Models\StockInHand;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StockInHand>
 */
class StockInHandFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_code' => Company::factory(),
            'section_code' => Section::factory(),
            'RefNo' => fake()->unique()->regexify('REF[0-9]{6}'),
            'OrdDate' => fake()->date(),
            'ItemKy' => Product::factory(),
            'Qty' => fake()->numberBetween(1, 100),
            'FreeQty' => fake()->numberBetween(0, 10),
            'TrnTyp' => fake()->randomElement(['PUR', 'SAL', 'TRF-IN', 'TRF-OUT']),
            'batch_no' => fake()->optional()->word(),
            'brand' => fake()->optional()->company(),
            'model' => fake()->optional()->word(),
            'serial_number' => fake()->optional()->regexify('[A-Z0-9]{10}'),
            'warranty' => fake()->optional()->word(),
            // owner_company_code is non-nullable in the schema; default to the same as company_code
            'owner_company_code' => function (array $attributes) {
                return $attributes['company_code'];
            },
            'uuid' => fake()->uuid(),
        ];
    }
}