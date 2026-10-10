<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class FinanceAccountSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $companies = \App\Models\Company::all();

        // Fallback admin user id
        $superAdmin = \App\Models\User::where('role_id', 1)->first();
        $adminId = $superAdmin ? $superAdmin->id : 1;

        foreach ($companies as $company) {
            // Find the main section for the company
            $mainSection = \App\Models\Section::where('company_code', $company->company_code)
                ->where('is_active', true)
                ->orderBy('is_main_stock', 'desc')
                ->first();

            $sectionCode = $mainSection ? $mainSection->section_code : null;

            if ($sectionCode) {
                $defaultAccounts = [
                    ['name' => 'Main Cash Account', 'type' => 'cash', 'opening_balance' => 0.00],
                    // ['name' => 'Main Cheque Account', 'type' => 'cheque', 'opening_balance' => 0.00],
                    // ['name' => 'Main Online Account', 'type' => 'online', 'opening_balance' => 0.00],
                    // ['name' => 'Main QR Payment Account', 'type' => 'qr_payment', 'opening_balance' => 0.00],
                ];

                foreach ($defaultAccounts as $acc) {
                    \App\Models\FinanceAccount::firstOrCreate([
                        'account_type' => $acc['type'],
                        'company_code' => $company->company_code,
                    ], [
                        'account_name' => $acc['name'],
                        'opening_balance' => 0,
                        'current_balance' => 0,
                        'section_code' => $sectionCode,
                        'status' => true,
                        'created_by' => $adminId,
                    ]);
                }
            }
        }
    }
}
