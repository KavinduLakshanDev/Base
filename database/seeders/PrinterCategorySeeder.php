<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CodeMaster;

class PrinterCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * This seeder marks which categories are for printers per company.
     * In different companies, the same category code can have different meanings:
     * - Vismass: CAT001 = Printers (is_printer_category = true)
     * - Malibu: CAT001 = Stationary (is_printer_category = false)
     */
    public function run(): void
    {
        // Vismass: CAT001 is Printers
        CodeMaster::where('conkey', 'CAT')
            ->where('company_code', 'VIS001')
            ->where('concode', 'CAT001')
            ->update(['is_printer_category' => true]);

        // Malibu: CAT001 is NOT Printers (it's stationary)
        CodeMaster::where('conkey', 'CAT')
            ->where('company_code', 'MAL001')
            ->where('concode', 'CAT001')
            ->update(['is_printer_category' => false]);

        // Default: All other categories are NOT printers
        CodeMaster::where('conkey', 'CAT')
            ->where('is_printer_category', null)
            ->update(['is_printer_category' => false]);

        $this->command->info('Printer category flags set successfully!');
    }
}
