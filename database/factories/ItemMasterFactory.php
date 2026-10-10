<?php

namespace Database\Factories;

use App\Models\ItemMaster;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ItemMaster>
 */
class ItemMasterFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = ItemMaster::class;

    /**
     * Define the model's default state.
     *
     * Only a handful of columns are populated; tests generally override
     * whatever they require explicitly.
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
            'Status' => 'A',
            'fInAct' => 0,
        ];
    }
}
