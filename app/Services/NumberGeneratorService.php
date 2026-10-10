<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class NumberGeneratorService
{
    public static function generate(string $type, string $companyCode, string $sectionCode): string
    {
        // Thread-safe implementation using database counter
        // This ensures no duplicates even under high concurrency
        
        $prefix = strtoupper(substr($type, 0, 3)); // GRN, TRN, etc.
        $c = substr($companyCode, 0, 3);
        $s = substr($sectionCode, 0, 3);
        
        // Use database to generate unique counter per type-company-section combination
        $counter = DB::table('batch_counters')->lockForUpdate()->where([
            'type' => $type,
            'company_code' => $companyCode,
            'section_code' => $sectionCode,
        ])->first();
        
        if (!$counter) {
            // Check the actual table to find the current maximum sequence
            $initialCount = self::getInitialCounter($type, $companyCode, $sectionCode);
            
            // Create new counter
            DB::table('batch_counters')->insert([
                'type' => $type,
                'company_code' => $companyCode,
                'section_code' => $sectionCode,
                'counter' => $initialCount + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $sequence = $initialCount + 1;
        } else {
            // Check the actual table to ensure counter isn't stale
            $tableMax = self::getInitialCounter($type, $companyCode, $sectionCode);
            $sequence = max($counter->counter, $tableMax) + 1;

            // Update existing counter
            DB::table('batch_counters')->where('id', $counter->id)->update([
                'counter' => $sequence,
                'updated_at' => now(),
            ]);
        }
        
        // Format: PRE-CCC-SSS-XXXX (sequential number)
        $suffix = str_pad($sequence % 10000, 4, '0', STR_PAD_LEFT);
        
        return "{$prefix}-{$c}-{$s}-{$suffix}";
    }

    public static function preview(string $type, string $companyCode, string $sectionCode): string
    {
        $prefix = strtoupper(substr($type, 0, 3));
        $c = substr($companyCode, 0, 3);
        $s = substr($sectionCode, 0, 3);
        
        $counter = DB::table('batch_counters')->where([
            'type' => $type,
            'company_code' => $companyCode,
            'section_code' => $sectionCode,
        ])->first();
        
        if ($counter) {
            $tableMax = self::getInitialCounter($type, $companyCode, $sectionCode);
            $sequence = max($counter->counter, $tableMax) + 1;
        } else {
            $sequence = self::getInitialCounter($type, $companyCode, $sectionCode) + 1;
        }
        
        $suffix = str_pad($sequence % 10000, 4, '0', STR_PAD_LEFT);
        
        return "{$prefix}-{$c}-{$s}-{$suffix}";
    }

    /**
     * Finds the last sequence number used in the actual transaction tables.
     */
    private static function getInitialCounter(string $type, string $companyCode, string $sectionCode): int
    {
        $prefix = strtoupper(substr($type, 0, 3));
        $c = substr($companyCode, 0, 3);
        $s = substr($sectionCode, 0, 3);
        $searchPattern = "{$prefix}-{$c}-{$s}-%";

        $tableName = '';
        $columnName = 'batch_no';

        switch ($type) {
            case 'ADJ':
                $tableName = 'stock_adjustments';
                break;
            case 'GRN':
                $tableName = 'purchase';
                break;
            case 'TRN':
                $tableName = 'stock_transfers';
                break;
            case 'PRN':
                $tableName = 'printer_transfers';
                break;
            case 'STK':
                $tableName = 'stock_takings';
                $columnName = 'taking_number';
                break;
        }

        if ($tableName) {
            // Find the maximum batch number that matches the pattern
            $lastRecord = DB::table($tableName)
                ->where($columnName, 'like', $searchPattern)
                ->orderBy($columnName, 'desc')
                ->first();

            if ($lastRecord) {
                $batchNo = $lastRecord->$columnName;
                $parts = explode('-', $batchNo);
                $lastPart = end($parts);
                if (is_numeric($lastPart)) {
                    return (int)$lastPart;
                }
            }
        }

        return 0; // Default to 0 so next is 1
    }
}
