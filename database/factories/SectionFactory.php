<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Section;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Section>
 */
class SectionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => fake()->uuid(),
            'section_code' => fake()->unique()->regexify('[A-Z]{2}[0-9]{3}'),
            'name' => fake()->word() . ' Section',
            'company_code' => Company::factory(),
            'is_main_stock' => fake()->boolean(),
        ];
    }
}