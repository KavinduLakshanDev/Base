<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Customer;
use App\Models\AccMas;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DeduplicateVismassCustomers extends Command
{
    protected $signature = 'app:deduplicate-vismass-customers';
    protected $description = 'Deduplicate customers under VIS001 and merge their records';

    public function handle()
    {
        $this->info('Starting deduplication of Vismass customers...');
        DB::beginTransaction();

        try {
            // 1. DEDUPLICATE BY PHONE (Stripping spaces and starting 0)
            $this->info('Deduplicating by Phone (TP1)...');
            $cleanPhoneSql = "TRIM(LEADING '0' FROM REPLACE(TP1, ' ', ''))";
            
            $duplicatePhones = Customer::select(DB::raw("{$cleanPhoneSql} as clean_phone"), DB::raw('COUNT(*) as count'))
                ->where('company_code', 'VIS001')
                ->whereNotNull('TP1')
                ->where('TP1', '!=', '')
                ->groupBy(DB::raw($cleanPhoneSql))
                ->havingRaw('COUNT(*) > 1')
                ->pluck('clean_phone');

            $mergedCountPhone = 0;

            foreach ($duplicatePhones as $phone) {
                // Fetch customers using the cleaned phone logic
                $customers = Customer::where('company_code', 'VIS001')
                    ->whereRaw("{$cleanPhoneSql} = ?", [$phone])
                    ->orderBy('AdrKy', 'asc')
                    ->get();

                if ($customers->count() <= 1) continue;

                $survivor = $customers->first();
                $duplicates = $customers->slice(1);

                foreach ($duplicates as $duplicate) {
                    $this->mergeCustomers($survivor, $duplicate);
                    $mergedCountPhone++;
                }
            }
            
            $this->info("Merged $mergedCountPhone duplicate customers by Phone.");

            // 2. DEDUPLICATE BY FULL NAME (FstNm + MidNm + LstNm)
            $this->info('Deduplicating by Full Name...');
            $duplicateNames = Customer::select('FstNm', 'MidNm', 'LstNm', DB::raw('COUNT(*) as count'))
                ->where('company_code', 'VIS001')
                ->groupBy('FstNm', 'MidNm', 'LstNm')
                ->havingRaw('COUNT(*) > 1')
                ->get(); // We get objects here so we can access all three name parts

            $mergedCountName = 0;

            foreach ($duplicateNames as $nameGroup) {
                // Fetch customers matching all 3 name parts precisely (handling NULLs)
                $customers = Customer::where('company_code', 'VIS001')
                    ->where('FstNm', $nameGroup->FstNm)
                    ->where(function($query) use ($nameGroup) {
                        if ($nameGroup->MidNm) {
                            $query->where('MidNm', $nameGroup->MidNm);
                        } else {
                            $query->whereNull('MidNm')->orWhere('MidNm', '');
                        }
                    })
                    ->where(function($query) use ($nameGroup) {
                        if ($nameGroup->LstNm) {
                            $query->where('LstNm', $nameGroup->LstNm);
                        } else {
                            $query->whereNull('LstNm')->orWhere('LstNm', '');
                        }
                    })
                    ->orderBy('AdrKy', 'asc')
                    ->get();

                if ($customers->count() <= 1) continue;

                $survivor = $customers->first();
                $duplicates = $customers->slice(1);

                foreach ($duplicates as $duplicate) {
                    $this->mergeCustomers($survivor, $duplicate);
                    $mergedCountName++;
                }
            }

            $this->info("Merged $mergedCountName duplicate customers by Full Name.");

            DB::commit();
            $this->info('Customer deduplication completed successfully!');
            return Command::SUCCESS;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Deduplication failed: ' . $e->getMessage());
            Log::error($e);
            return Command::FAILURE;
        }
    }

    private function mergeCustomers($survivor, $duplicate)
    {
        $survivorAdrKy = $survivor->AdrKy;
        $survivorAccKy = $survivor->AccKy;
        $duplicateAdrKy = $duplicate->AdrKy;
        $duplicateAccKy = $duplicate->AccKy;

        $this->line("Merging duplicate #$duplicateAdrKy into survivor #$survivorAdrKy...");

        // 1. Reassign Sales Transactions
        DB::table('sales_transactions')->where('customer_id', $duplicateAdrKy)->update(['customer_id' => $survivorAdrKy]);

        // 2. Reassign Customer Returns
        DB::table('customer_returns')->where('customer_id', $duplicateAdrKy)->update(['customer_id' => $survivorAdrKy]);

        // 3. Reassign Customer Payments
        DB::table('customer_payments')->where('customer_id', $duplicateAdrKy)->update(['customer_id' => $survivorAdrKy]);

        // 4. Reassign Shops
        DB::table('shops')->where('external_customer_id', $duplicateAdrKy)->update(['external_customer_id' => $survivorAdrKy]);

        // 5. Reassign Service Jobs & Ledger Entries
        if ($duplicateAccKy && $survivorAccKy) {
            DB::table('service_jobs')->where('AccKy', $duplicateAccKy)->update(['AccKy' => $survivorAccKy]);
            DB::table('acc_trn')->where('AccKy', $duplicateAccKy)->update(['AccKy' => $survivorAccKy]);
            
            // Combine opening balances
            $dupAccount = AccMas::find($duplicateAccKy);
            $survAccount = AccMas::find($survivorAccKy);
            
            if ($dupAccount && $survAccount) {
                $survAccount->opening_balance += $dupAccount->opening_balance;
                $survAccount->save();
            }

            // Delete Duplicate Account Master
            DB::table('acc_mas')->where('AccKy', $duplicateAccKy)->delete();
        }

        // 6. Delete Duplicate Customer Record
        DB::table('address')->where('AdrKy', $duplicateAdrKy)->delete();
    }
}