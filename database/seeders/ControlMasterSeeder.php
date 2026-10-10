<?php

namespace Database\Seeders;

use App\Models\ControlMaster;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ControlMasterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $controls = [
            [
                'concode' => 'CTRL001',
                'conkey' => 'CAT',
                'conname' => 'Category Controller',
                'is_active' => true,
            ],
            [
                'concode' => 'CTRL002',
                'conkey' => 'UNT',
                'conname' => 'Unit Controller',
                'is_active' => true,
            ],
            [
                'concode' => 'CTRL003',
                'conkey' => 'STS',
                'conname' => 'Status Controller',
                'is_active' => true,
            ],
            [
                'concode' => 'CTRL004',
                'conkey' => 'PAY',
                'conname' => 'Payment Controller',
                'is_active' => true,
            ],
            [
                'concode' => 'CTRL005',
                'conkey' => 'CUST',
                'conname' => 'Customer Controller',
                'is_active' => true,
            ],
            [
                'concode' => 'CTRL006',
                'conkey' => 'SUP',
                'conname' => 'Supplier Controller',
                'is_active' => true,
            ],
            [
                'concode' => 'CTRL007',
                'conkey' => 'PRD',
                'conname' => 'Product Controller',
                'is_active' => true,
            ],
            [
                'concode' => 'CTRL008',
                'conkey' => 'TAX',
                'conname' => 'Tax Controller',
                'is_active' => true,
            ],
            [
                'concode' => 'CTRL009',
                'conkey' => 'ADR',
                'conname' => 'Address Type Controller',
                'is_active' => true,
            ],
            [
                'concode' => 'CTRL010',
                'conkey' => 'TRN',
                'conname' => 'Transaction Type Controller',
                'is_active' => true,
            ],
        ];

        foreach ($controls as $control) {
            ControlMaster::updateOrCreate(
                ['conkey' => $control['conkey']],
                array_merge($control, [
                    'company_code' => null,
                    'section_code' => null,
                    'uuid' => (string) Str::uuid(),
                ])
            );
        }

        $this->command->info('✅ Control Master seeded successfully!');
    }
}