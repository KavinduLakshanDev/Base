<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class MigrateDeliveryItemReturns extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:delivery-returns';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate past shop returns to properly set returned_quantity on DeliveryItems';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting data migration for past returns...');

        $returns = \App\Models\ShopReturnItem::with(['shopReturn'])->get();

        foreach ($returns as $retItem) {
            $shopReturn = $retItem->shopReturn;
            
            if (!$shopReturn || $shopReturn->status === 'cancelled') {
                continue;
            }

            $remainingToAdjust = (float)$retItem->quantity;

            // Find matching DeliveryItem(s) for this shop, similar to how it was originally deducted
            $deliveryQuery = \App\Models\Delivery::query()
                ->where('shop_id', $shopReturn->shop_id)
                ->where('company_code', $shopReturn->company_code)
                ->where('status', '!=', 'cancelled');

            if ($shopReturn->delivery_id) {
                $deliveryQuery->where('id', $shopReturn->delivery_id);
            }

            $deliveries = $deliveryQuery->orderBy('delivery_date', 'asc')->get();

            foreach ($deliveries as $delivery) {
                if ($remainingToAdjust <= 0) break;

                // Find items that match the returned item.
                // We order by id desc since the original code did that.
                // We need to restore the quantity that was reduced.
                // How to know WHICH one was reduced? 
                // We'll just restore up to the return amount on matching items.
                $dItems = $delivery->items()
                    ->where('ItmKy', $retItem->item_ky)
                    ->where('batch_no', $retItem->batch_no ?? 'DEFAULT')
                    ->orderBy('id', 'desc')
                    ->get();

                foreach ($dItems as $dItem) {
                    if ($remainingToAdjust <= 0) break;

                    // Add back the quantity and set returned_quantity
                    // Wait, we don't know the exact original quantity, but we know it was deducted by $remainingToAdjust.
                    // If we just add it back, that restores it.
                    $deduct = $remainingToAdjust;
                    
                    $dItem->quantity = $dItem->quantity + $deduct;
                    $dItem->returned_quantity = $dItem->returned_quantity + $deduct;
                    $dItem->total_amount = $dItem->quantity * $dItem->unit_price;
                    $dItem->save();

                    $remainingToAdjust -= $deduct;
                }
            }

            if ($remainingToAdjust > 0) {
                $this->warn("Could not find matching DeliveryItem to restore {$remainingToAdjust} for ShopReturn #{$shopReturn->id}");
            }
        }

        $this->info('Migration complete!');
    }
}
