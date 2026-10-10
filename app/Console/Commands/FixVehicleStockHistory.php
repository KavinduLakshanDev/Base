<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\VehicleStock;
use App\Models\StockInHand;
use Illuminate\Support\Facades\DB;

class FixVehicleStockHistory extends Command
{
    protected $signature = 'fix:vehicle-stock-history';
    protected $description = 'Recalculate loaded_quantity and delivered_quantity for vehicle stocks based on transaction history';

    public function handle()
    {
        $this->info('Starting vehicle stock history recalculation...');

        $stocks = VehicleStock::all();
        $bar = $this->output->createProgressBar($stocks->count());

        foreach ($stocks as $vs) {
            // Calculate Loaded Quantity (Net Loaded = Load - Unload + Return)
            $loaded = StockInHand::where('vehicle_id', $vs->vehicle_id)
                ->where('ItemKy', $vs->item_ky)
                ->where('batch_no', $vs->batch_no)
                ->whereIn('TrnTyp', ['VLOAD-IN', 'VUNLOAD-OUT', 'V-RET'])
                ->sum('Qty');

            // Calculate Delivered Quantity = total V-DEL minus total V-RET (returns)
            $totalDel = StockInHand::where('vehicle_id', $vs->vehicle_id)
                ->where('ItemKy', $vs->item_ky)
                ->where('batch_no', $vs->batch_no)
                ->where('TrnTyp', 'V-DEL')
                ->sum(DB::raw('ABS(Qty)'));

            $totalRet = StockInHand::where('vehicle_id', $vs->vehicle_id)
                ->where('ItemKy', $vs->item_ky)
                ->where('batch_no', $vs->batch_no)
                ->where('TrnTyp', 'V-RET')
                ->sum(DB::raw('ABS(Qty)'));

            $delivered = $totalDel - $totalRet;

            // Update Vehicle Stock
            $vs->loaded_quantity = $loaded;
            $vs->delivered_quantity = $delivered;
            
            // Optional: Recalculate current quantity too to be safe? 
            // quantity = loaded - delivered
            // But let's trust the current quantity might be correct or we can recalculate it too.
            // Let's recalculate it to be consistent.
            $currentQty = $loaded - $delivered;
            
            // Check delta
            if (abs($vs->quantity - $currentQty) > 0.001) {
                // $this->warn("\n Mismatch for VS ID {$vs->id}: Current {$vs->quantity} vs Calc {$currentQty}");
            }
            $vs->quantity = $currentQty; 

            $vs->save();
            $bar->advance();
        }

        $bar->finish();
        $this->info("\nFixed successfully.");
    }
}
