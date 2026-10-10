<?php

namespace App\Console\Commands;

use App\Models\Purchase;
use App\Models\PurchaseDet;
use Illuminate\Console\Command;

class DebugPrintingProducts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'debug:printing-products';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Debug printing section products data';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== Debug Printing Products ===');
        
        // Test 1: Count total purchase records
        $totalPurchases = Purchase::count();
        $this->line("Total Purchase records: " . $totalPurchases);
        
        // Test 2: Count total purchase detail records
        $totalPurchaseDets = PurchaseDet::count();
        $this->line("Total PurchaseDet records: " . $totalPurchaseDets);
        
        if ($totalPurchases == 0 && $totalPurchaseDets == 0) {
            $this->error("No purchase or purchase detail records found in database!");
            return;
        }
        
        // Test 3: Get first few purchase records
        $purchases = Purchase::take(3)->get();
        $this->line("\nFirst 3 Purchase records:");
        foreach ($purchases as $purchase) {
            $this->line("  ID: {$purchase->PurchaseKey}, Company: {$purchase->company_code}, Section: {$purchase->section_code}, Type: " . ($purchase->type ?? 'null'));
        }
        
        // Test 4: Get first few purchase detail records
        $purchaseDets = PurchaseDet::take(3)->get();
        $this->line("\nFirst 3 PurchaseDet records:");
        foreach ($purchaseDets as $det) {
            $this->line("  ID: {$det->PerchaseDetKy}, Company: {$det->company_code}, Section: {$det->section_code}, Item: " . ($det->item_name ?? 'null'));
        }
        
        // Test 5: Try the actual query from the controller
        $this->line("\n=== Testing Controller Query ===");
        
        $query = PurchaseDet::with(['purchase', 'purchase.supplier', 'purchase.company', 'purchase.section'])
            ->whereHas('purchase', function($q) {
                // Just filter by any company code for testing
                $q->whereNotNull('company_code');
            })
            ->whereNotNull('company_code');
            
        $queryCount = $query->count();
        $this->line("Query result count: " . $queryCount);
        
        if ($queryCount > 0) {
            $samples = $query->take(2)->get();
            $this->line("Sample query results:");
            foreach ($samples as $product) {
                try {
                    $this->line("  ID: {$product->PerchaseDetKy}");
                    $this->line("  Item Name: " . ($product->item_name ?? 'null'));
                    $this->line("  Purchase exists: " . ($product->purchase ? 'Yes' : 'No'));
                    if ($product->purchase) {
                        $this->line("  Purchase ID: {$product->purchase->PurchaseKey}");
                        $this->line("  Supplier exists: " . ($product->purchase->supplier ? 'Yes' : 'No'));
                        if ($product->purchase->supplier) {
                            $this->line("  Supplier Name: " . ($product->purchase->supplier->FstNm ?? 'N/A'));
                        }
                    }
                    $this->line("  ---");
                } catch (\Exception $e) {
                    $this->error("  Error processing record: " . $e->getMessage());
                }
            }
        }
        
        $this->info('Debug complete!');
    }
}
