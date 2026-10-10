<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\ItemPriceDet;
use Illuminate\Support\Facades\Log;

class ProductObserver
{
    /**
     * Handle the Product "saved" event.
     * This covers both created and updated events.
     */
    public function saved(Product $product)
    {
        // Only create a price detail record if price-related fields were changed, 
        // or if the product was just created.
        if ($product->wasRecentlyCreated || $this->priceFieldsChanged($product)) {
            $this->createPriceDetail($product);
        }
    }

    /**
     * Check if any price-related fields changed.
     */
    protected function priceFieldsChanged(Product $product): bool
    {
        $priceFields = [
            'CosPri', 'SlsPri', 'WholePrice', 'VehicleSalePrice',
            'NCostPrice', 'RtQty1', 'RtDis1', 'RtQty2', 'RtDis2',
            'RtQty3', 'RtDis3', 'RtQty4', 'RtDis4', 'warranty'
        ];

        return $product->wasChanged($priceFields);
    }

    /**
     * Create a record in item_price_det based on current product state.
     */
    protected function createPriceDetail(Product $product)
    {
        try {
            ItemPriceDet::create([
                'ItmKy' => $product->ItmKy,
                'warranty' => $product->warranty,
                'company_code' => $product->company_code,
                'section_code' => $product->section_code,
                'CosPri' => $product->CosPri ?? 0,
                'SlsPri' => $product->SlsPri ?? 0,
                'WholePrice' => $product->WholePrice ?? 0,
                'VehicleSalePrice' => $product->VehicleSalePrice ?? 0,
                'NCostPrice' => $product->NCostPrice ?? 0,
                'RtQty1' => $product->RtQty1 ?? 0,
                'RtDis1' => $product->RtDis1 ?? 0,
                'RtQty2' => $product->RtQty2 ?? 0,
                'RtDis2' => $product->RtDis2 ?? 0,
                'RtQty3' => $product->RtQty3 ?? 0,
                'RtDis3' => $product->RtDis3 ?? 0,
                'RtQty4' => $product->RtQty4 ?? 0,
                'RtDis4' => $product->RtDis4 ?? 0,
                'Status' => $product->Status ?? 'A',
                'fInAct' => $product->fInAct ?? false,
                'InUse' => 'Y',
                'ChangedDate' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('ProductObserver failed to create ItemPriceDet: ' . $e->getMessage());
        }
    }
}
