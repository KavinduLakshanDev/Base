<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\ServiceJob;

class ServiceJobFactory extends Factory
{
    protected $model = ServiceJob::class;

    public function definition()
    {
        return [
            'job_number' => 'SJ-' . date('Ymd') . '-' . random_int(1000, 9999),
            'customer_name' => fake()->name(),
            'customer_phone' => fake()->phoneNumber(),
            'device_name' => fake()->word(),
            'device_model' => fake()->word(),
            'device_brand' => fake()->word(),
            'problem_description' => fake()->sentence(),
            'status' => 'pending',
            'created_by' => \App\Models\User::factory(),
            // Add other fields as necessary
        ];
    }
}
