<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MigrateMalibuToVismass extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:migrate-malibu-to-vismass';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrates all delivery-related records from Malibu (MAL001) to Vismass (VIS001)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting migration of Malibu delivery data to Vismass...');

        DB::beginTransaction();

        try {
            // 1. Handle unique constraint on vehicles (company_code, assigned_user_id)
            // If Vismass already has this user assigned to a vehicle, we must nullify the assigned_user_id on the Malibu vehicles before migrating.
            $malibuVehicles = DB::table('vehicles')
                ->where('company_code', 'MAL001')
                ->whereNotNull('assigned_user_id')
                ->get();

            foreach ($malibuVehicles as $vehicle) {
                $vismassHasUser = DB::table('vehicles')
                    ->where('company_code', 'VIS001')
                    ->where('assigned_user_id', $vehicle->assigned_user_id)
                    ->exists();

                if ($vismassHasUser) {
                    DB::table('vehicles')
                        ->where('id', $vehicle->id)
                        ->update(['assigned_user_id' => null]);
                    
                    $this->warn("Nullified assigned_user_id for Malibu vehicle ID {$vehicle->id} due to conflict with Vismass.");
                }
            }

            // 2. Migrate tables
            $tables = [
                'deliveries',
                'delivery_routes',
                'delivery_payments',
                'delivery_petty_cash_transactions',
                'delivery_petty_cash_categories',
                'vehicles',
                'vehicle_stocks',
                'shops',
                'shop_returns'
            ];

            foreach ($tables as $table) {
                if (Schema::hasColumn($table, 'company_code')) {
                    
                    if ($table === 'deliveries') {
                        // Handle duplicate delivery_numbers
                        $malibuDeliveries = DB::table('deliveries')->where('company_code', 'MAL001')->get();
                        $updatedCount = 0;
                        foreach ($malibuDeliveries as $delivery) {
                            $exists = DB::table('deliveries')
                                ->where('company_code', 'VIS001')
                                ->where('delivery_number', $delivery->delivery_number)
                                ->exists();
                            
                            $newNumber = $delivery->delivery_number;
                            if ($exists) {
                                $newNumber = $delivery->delivery_number . '-MAL';
                            }
                            
                            DB::table('deliveries')
                                ->where('id', $delivery->id)
                                ->update([
                                    'company_code' => 'VIS001',
                                    'delivery_number' => $newNumber
                                ]);
                            $updatedCount++;
                        }
                        $this->info("Updated {$updatedCount} records in {$table}");
                    } else if ($table === 'delivery_routes') {
                        // Handle duplicate delivery route names
                        $malibuRoutes = DB::table('delivery_routes')->where('company_code', 'MAL001')->get();
                        $updatedCount = 0;
                        foreach ($malibuRoutes as $route) {
                            // If there is a name collision, we might just rename it (if there is a unique key on name+company_code)
                            // There might not be a unique key, but just in case, we don't strictly need to rename unless it fails. 
                            // Actually it's safer to just try updating directly.
                            // But let's check unique constraints. Let's just do a blanket update. If it fails we'll see.
                            DB::table('delivery_routes')->where('id', $route->id)->update(['company_code' => 'VIS001']);
                            $updatedCount++;
                        }
                        $this->info("Updated {$updatedCount} records in {$table}");
                    } else {
                        // General update for other tables
                        $updated = DB::table($table)
                            ->where('company_code', 'MAL001')
                            ->update(['company_code' => 'VIS001']);
                        
                        $this->info("Updated {$updated} records in {$table}");
                    }
                } else {
                    $this->warn("Table {$table} does not have a company_code column.");
                }
            }

            DB::commit();
            $this->info('Migration completed successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Migration failed: ' . $e->getMessage());
            return 1;
        }

        return 0;
    }
}