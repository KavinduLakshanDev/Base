<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Customer;
use Illuminate\Support\Facades\DB;

class CheckDuplicateCustomers extends Command
{
    protected $signature = 'app:check-duplicate-customers';
    protected $description = 'Check for duplicate customers in Vismass (VIS001)';

    public function handle()
    {
        $this->info('Checking for duplicate customers under VIS001...');

        // 1. Remove spaces
        // 2. Remove the starting '0'
        $cleanPhoneSql = "TRIM(LEADING '0' FROM REPLACE(TP1, ' ', ''))";

        $duplicates = Customer::select(
                'FstNm', 
                'MidNm', 
                'LstNm', 
                DB::raw("{$cleanPhoneSql} as clean_phone"), 
                DB::raw('COUNT(*) as count')
            )
            ->where('company_code', 'VIS001')
            ->whereNotNull('TP1')
            ->where('TP1', '!=', '')
            ->groupBy('FstNm', 'MidNm', 'LstNm', DB::raw($cleanPhoneSql))
            ->havingRaw('COUNT(*) > 1')
            ->orderByDesc('count')
            ->get();

        if ($duplicates->isNotEmpty()) {
            $this->warn("\nExact Duplicates Found: {$duplicates->count()} groups");
            
            $this->table(
                ['First Name', 'Middle Name', 'Last Name', 'Phone (Stripped)', 'Occurrences'], 
                $duplicates->toArray()
            );
        } else {
            $this->info('No exact duplicates found!');
        }
        
        return 0;
    }
}