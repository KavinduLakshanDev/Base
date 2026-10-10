<?php

namespace Database\Seeders;

use App\Models\Section;
use Illuminate\Database\Seeder;

class SectionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Add Main Stock section for Vismass company
        Section::firstOrCreate(
            ['section_code' => 'VIS-SEC-003'],
            [
                'uuid' => \Illuminate\Support\Str::uuid(),
                'company_code' => 'VIS001',
                'name' => 'Main Stock',
                'section_type' => 'store',
                'is_main_stock' => true,
                'is_active' => true,
            ]
        );
    }
}