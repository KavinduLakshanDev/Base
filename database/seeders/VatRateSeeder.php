<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\VatRate;
use Illuminate\Database\Seeder;

class VatRateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get the Vismass company
        $vismass = Company::where('company_code', 'VIS001')->first();

        if ($vismass) {
            // Create VAT rate for Vismass
            VatRate::create([
                'company_id' => $vismass->id,
                'vat_rate' => $vismass->vat_rate, // 18.00
                'vat_no' => $vismass->vat_no, // '123456789V'
                'effective_date' => $vismass->vat_effective_date ?? now(),
                'is_active' => true,
            ]);
        }
    }
}