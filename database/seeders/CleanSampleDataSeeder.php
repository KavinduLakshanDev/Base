<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\StockInHand;
use Illuminate\Database\Seeder;

class CleanSampleDataSeeder extends Seeder
{
    /**
     * Run the database seeds to clean up sample data.
     */
    public function run(): void
    {
        $this->command->info('Starting sample data cleanup...');

        // Remove specific sample products that were likely created by seeders
        $sampleItemCodes = [
            'PROD001',
            'PROD002',
            'PROD003',
            'ITEM001',
            'ITEM002',
            'ITEM003',
        ];

        $sampleItemNames = [
            'Sample Product 1',
            'Sample Product 2',
            'Sample Product 3',
            'Test Product',
            'Demo Item',
            'Fake Product',
        ];

        // Remove by ItemCode
        foreach ($sampleItemCodes as $itemCode) {
            $product = Product::where('ItemCode', $itemCode)->first();
            if ($product) {
                // Delete related stock records
                StockInHand::whereRaw("ItemKy = ?", [$product->ItmKy])->delete();

                $product->delete();
                $this->command->info("Removed sample product: {$product->ItmNm} ({$itemCode})");
            }
        }

        // Remove by ItemName
        foreach ($sampleItemNames as $itemName) {
            $products = Product::where('ItmNm', $itemName)->get();
            foreach ($products as $product) {
                // Delete related stock records
                StockInHand::whereRaw("ItemKy = ?", [$product->ItmKy])->delete();

                $product->delete();
                $this->command->info("Removed sample product: {$itemName} ({$product->ItemCode})");
            }
        }

        // Remove products with ItemCode starting with 'PROD' or 'ITEM'
        $patternProducts = Product::where('ItemCode', 'LIKE', 'PROD%')
                                 ->orWhere('ItemCode', 'LIKE', 'ITEM%')
                                 ->get();

        foreach ($patternProducts as $product) {
            // Delete related stock records
            StockInHand::whereRaw("ItemKy = ?", [$product->ItmKy])->delete();

            $product->delete();
            $this->command->info("Removed pattern-matched product: {$product->ItmNm} ({$product->ItemCode})");
        }

        $this->command->info('Sample data cleanup completed!');
        $this->command->info('Remaining products: ' . Product::count());
        $this->command->info('Remaining stock records: ' . StockInHand::count());
    }
}
