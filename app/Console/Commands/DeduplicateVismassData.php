<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DeduplicateVismassData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:deduplicate-vismass-data';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Deduplicate shops and delivery routes under VIS001 after Malibu data migration';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting deduplication of Vismass shops and routes...');
        DB::beginTransaction();

        try {
            // 1. Deduplicate Shops
            $this->info('Deduplicating shops...');
            $duplicateShopNames = DB::table('shops')
                ->select('name', DB::raw('COUNT(*) as count'))
                ->where('company_code', 'VIS001')
                ->groupBy('name')
                ->havingRaw('COUNT(*) > 1')
                ->pluck('name');

            $shopsDeleted = 0;
            foreach ($duplicateShopNames as $name) {
                // Get all shops with this name, sorted by ID ascending
                $shops = DB::table('shops')
                    ->where('company_code', 'VIS001')
                    ->where('name', $name)
                    ->orderBy('id', 'asc')
                    ->get();
                
                $survivorId = $shops->first()->id;
                $duplicates = $shops->slice(1);

                foreach ($duplicates as $dup) {
                    $dupId = $dup->id;
                    
                    // deliveries
                    DB::table('deliveries')->where('shop_id', $dupId)->update(['shop_id' => $survivorId]);
                    
                    // shop_returns
                    DB::table('shop_returns')->where('shop_id', $dupId)->update(['shop_id' => $survivorId]);
                    
                    // delivery_route_shop (need to check for unique constraint delivery_route_id + shop_id)
                    $routeLinks = DB::table('delivery_route_shop')->where('shop_id', $dupId)->get();
                    foreach ($routeLinks as $link) {
                        $exists = DB::table('delivery_route_shop')
                            ->where('delivery_route_id', $link->delivery_route_id)
                            ->where('shop_id', $survivorId)
                            ->exists();
                        
                        if ($exists) {
                            DB::table('delivery_route_shop')->where('id', $link->id)->delete();
                        } else {
                            DB::table('delivery_route_shop')->where('id', $link->id)->update(['shop_id' => $survivorId]);
                        }
                    }

                    // Delete the duplicate shop
                    DB::table('shops')->where('id', $dupId)->delete();
                    $shopsDeleted++;
                }
            }
            $this->info("Deleted {$shopsDeleted} duplicate shops.");


            // 2. Deduplicate Delivery Routes
            $this->info('Deduplicating delivery routes...');
            $duplicateRouteNames = DB::table('delivery_routes')
                ->select('name', DB::raw('COUNT(*) as count'))
                ->where('company_code', 'VIS001')
                ->groupBy('name')
                ->havingRaw('COUNT(*) > 1')
                ->pluck('name');

            $routesDeleted = 0;
            foreach ($duplicateRouteNames as $name) {
                $routes = DB::table('delivery_routes')
                    ->where('company_code', 'VIS001')
                    ->where('name', $name)
                    ->orderBy('id', 'asc')
                    ->get();
                
                $survivorId = $routes->first()->id;
                $duplicates = $routes->slice(1);

                foreach ($duplicates as $dup) {
                    $dupId = $dup->id;
                    
                    // deliveries
                    DB::table('deliveries')->where('delivery_route_id', $dupId)->update(['delivery_route_id' => $survivorId]);
                    
                    // shops
                    // Note: Check if shops table has delivery_route_id. Migration 2026_02_19_231500_add_delivery_route_id_to_shops_table.php shows it does.
                    DB::table('shops')->where('delivery_route_id', $dupId)->update(['delivery_route_id' => $survivorId]);

                    // delivery_route_shop
                    $shopLinks = DB::table('delivery_route_shop')->where('delivery_route_id', $dupId)->get();
                    foreach ($shopLinks as $link) {
                        $exists = DB::table('delivery_route_shop')
                            ->where('delivery_route_id', $survivorId)
                            ->where('shop_id', $link->shop_id)
                            ->exists();
                        
                        if ($exists) {
                            DB::table('delivery_route_shop')->where('id', $link->id)->delete();
                        } else {
                            DB::table('delivery_route_shop')->where('id', $link->id)->update(['delivery_route_id' => $survivorId]);
                        }
                    }

                    // delivery_route_user
                    $userLinks = DB::table('delivery_route_user')->where('delivery_route_id', $dupId)->get();
                    foreach ($userLinks as $link) {
                        $exists = DB::table('delivery_route_user')
                            ->where('delivery_route_id', $survivorId)
                            ->where('user_id', $link->user_id)
                            ->exists();
                        
                        if ($exists) {
                            DB::table('delivery_route_user')->where('id', $link->id)->delete();
                        } else {
                            DB::table('delivery_route_user')->where('id', $link->id)->update(['delivery_route_id' => $survivorId]);
                        }
                    }

                    // Delete the duplicate route
                    DB::table('delivery_routes')->where('id', $dupId)->delete();
                    $routesDeleted++;
                }
            }
            $this->info("Deleted {$routesDeleted} duplicate delivery routes.");

            DB::commit();
            $this->info('Deduplication completed successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Deduplication failed: ' . $e->getMessage());
            return 1;
        }

        return 0;
    }
}