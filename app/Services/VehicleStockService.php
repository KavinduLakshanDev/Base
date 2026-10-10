<?php

namespace App\Services;

use App\Models\VehicleStock;
use App\Models\StockInHand;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class VehicleStockService
{
    /**
     * Transfer quantity from a warehouse section (stock_in_hand) into a vehicle stock row.
     * Creates corresponding stock_in_hand entries and updates/creates vehicle_stocks row.
     */
    public function loadToVehicle(array $payload)
    {
        // payload: vehicle_id, section_code, item_ky, batch_no, quantity, company_code, recorded_by (optional)
        return DB::transaction(function () use ($payload) {
            // Create stock_out from section (negative Qty)
            StockInHand::create([
                'RefNo' => $payload['ref'] ?? 'VEH-LOAD',
                'Cky' => $payload['section_id'] ?? null,
                'company_code' => $payload['company_code'],
                'owner_company_code' => $payload['company_code'],
                'section_code' => $payload['section_code'] ?? null,
                'OrdDate' => now()->format('Y-m-d'),
                'ItemKy' => $payload['item_ky'],
                'Qty' => -abs($payload['quantity']),
                'FreeQty' => 0,
                'TrnTyp' => 'VLOAD-OUT',
                'OrdKy' => $payload['vehicle_id'],
                'batch_no' => $payload['batch_no'] ?? null,
            ]);

            // Create stock_in for vehicle (positive Qty) with vehicle_id set
            StockInHand::create([
                'RefNo' => $payload['ref'] ?? 'VEH-LOAD',
                'Cky' => $payload['section_id'] ?? null,
                'company_code' => $payload['company_code'],
                'owner_company_code' => $payload['company_code'],
                'section_code' => null, // Vehicle stock should not belong to warehouse section
                'vehicle_id' => $payload['vehicle_id'],
                'OrdDate' => now()->format('Y-m-d'),
                'ItemKy' => $payload['item_ky'],
                'Qty' => abs($payload['quantity']),
                'FreeQty' => 0,
                'TrnTyp' => 'VLOAD-IN',
                'OrdKy' => $payload['vehicle_id'],
                'batch_no' => $payload['batch_no'] ?? null,
            ]);

            // Update vehicle_stocks aggregate row
            $vs = VehicleStock::where('vehicle_id', $payload['vehicle_id'])
                ->where('item_ky', $payload['item_ky'])
                ->where('batch_no', $payload['batch_no'] ?? null)
                ->lockForUpdate()
                ->first();

            if ($vs) {
                $vs->quantity = $vs->quantity + $payload['quantity'];
                $vs->loaded_quantity = $vs->loaded_quantity + $payload['quantity'];
                $vs->last_date = now()->toDateString();
                $vs->save();
            } else {
                $vs = VehicleStock::create([
                    'vehicle_id' => $payload['vehicle_id'],
                    'item_ky' => $payload['item_ky'],
                    'batch_no' => $payload['batch_no'] ?? null,
                    'serial_number' => $payload['serial_number'] ?? null,
                    'quantity' => $payload['quantity'],
                    'loaded_quantity' => $payload['quantity'],
                    'delivered_quantity' => 0,
                    'reserved_quantity' => 0,
                    'company_code' => $payload['company_code'],
                    'last_date' => now()->toDateString(),
                ]);
            }

            return $vs;
        });
    }

    /**
     * Deduct quantity from vehicle stock (used when assigning delivery from vehicle)
     * Returns true if successful, throws exception on insufficient stock.
     */
    public function deductFromVehicle(int $vehicleId, $itemKy, ?string $batchNo, float $quantity)
    {
        return DB::transaction(function () use ($vehicleId, $itemKy, $batchNo, $quantity) {
            $vs = VehicleStock::where('vehicle_id', $vehicleId)
                ->where('item_ky', $itemKy)
                ->where('batch_no', $batchNo)
                ->lockForUpdate()
                ->first();

            if (!$vs || ((float) $vs->quantity - (float) $vs->reserved_quantity) < $quantity) {
                throw new \Exception('Insufficient vehicle stock for the requested item/batch');
            }

            $vs->quantity = $vs->quantity - $quantity;
            $vs->delivered_quantity = $vs->delivered_quantity + $quantity;
            $vs->save();

            // Record movement in stock_in_hand with vehicle_id set
            StockInHand::create([
                'RefNo' => 'V-DEL',
                'Cky' => null,
                'company_code' => $vs->company_code,
                'owner_company_code' => $vs->company_code,
                'section_code' => null,
                'vehicle_id' => $vehicleId,
                'OrdDate' => now()->format('Y-m-d'),
                'ItemKy' => $itemKy,
                'Qty' => -abs($quantity),
                'FreeQty' => 0,
                'TrnTyp' => 'V-DEL',
                'OrdKy' => $vehicleId,
                'batch_no' => $batchNo,
            ]);

            return $vs;
        });
    }

    /**
     * Add quantity back to vehicle stock (used for returns)
     */
    public function addToVehicle(int $vehicleId, $itemKy, ?string $batchNo, float $quantity, string $companyCode, bool $adjustDelivered = true)
    {
        return DB::transaction(function () use ($vehicleId, $itemKy, $batchNo, $quantity, $companyCode, $adjustDelivered) {
            // Log incoming parameters for debugging
            Log::debug('VehicleStockService::addToVehicle', compact('vehicleId','itemKy','batchNo','quantity','companyCode','adjustDelivered'));

            $vs = VehicleStock::where('vehicle_id', $vehicleId)
                ->where('item_ky', $itemKy)
                ->where('batch_no', $batchNo)
                ->lockForUpdate()
                ->first();

            if ($vs) {
                Log::debug('VehicleStock found, before qty', ['quantity' => $vs->quantity, 'delivered' => $vs->delivered_quantity]);
                $vs->quantity = $vs->quantity + $quantity;

                if ($adjustDelivered) {
                    $vs->delivered_quantity = max(0, $vs->delivered_quantity - $quantity);
                }

                // Do NOT increment loaded_quantity — returns are not new warehouse loads.
                // loaded_quantity tracks only original warehouse→vehicle loads.
                $vs->last_date = now()->toDateString();
                $vs->save();
                Log::debug('VehicleStock updated, after qty', ['quantity' => $vs->quantity, 'delivered' => $vs->delivered_quantity]);
            } else {
                Log::debug('VehicleStock not found, creating new row');
                $vs = VehicleStock::create([
                    'vehicle_id' => $vehicleId,
                    'item_ky' => $itemKy,
                    'batch_no' => $batchNo,
                    'quantity' => $quantity,
                    'loaded_quantity' => $quantity,
                    'delivered_quantity' => 0,
                    'reserved_quantity' => 0,
                    'company_code' => $companyCode,
                    'last_date' => now()->toDateString(),
                ]);
                Log::debug('VehicleStock created', ['id' => $vs->id]);
            }

            StockInHand::create([
                'RefNo' => 'V-RET',
                'Cky' => null,
                'company_code' => $companyCode,
                'owner_company_code' => $companyCode,
                'section_code' => null,
                'vehicle_id' => $vehicleId,
                'OrdDate' => now()->format('Y-m-d'),
                'ItemKy' => $itemKy,
                'Qty' => abs($quantity),
                'FreeQty' => 0,
                'TrnTyp' => 'V-RET',
                'OrdKy' => $vehicleId,
                'batch_no' => $batchNo,
            ]);

            return $vs;
        });
    }

    /**
     * Unload quantity from vehicle stock back to a warehouse section.
     * Reverses the loadToVehicle operation.
     */
    public function unloadFromVehicle(array $payload)
    {
        // payload: vehicle_id, section_code, item_ky, batch_no, quantity, company_code
        return DB::transaction(function () use ($payload) {
            $vehicleId = $payload['vehicle_id'];
            $itemKy = $payload['item_ky'];
            $batchNo = $payload['batch_no'] ?? null;
            $quantity = abs($payload['quantity']);
            $sectionCode = $payload['section_code'];
            $companyCode = $payload['company_code'];

            // 1. Decrement VehicleStock
            $vs = VehicleStock::where('vehicle_id', $vehicleId)
                ->where('item_ky', $itemKy)
                ->where('batch_no', $batchNo)
                ->lockForUpdate()
                ->first();

            if (!$vs || ((float) $vs->quantity - (float) $vs->reserved_quantity) < $quantity) {
                throw new \Exception('Insufficient vehicle stock to unload.');
            }

            $vs->quantity = $vs->quantity - $quantity;
            $vs->loaded_quantity = $vs->loaded_quantity - $quantity;
            $vs->save();

            // 2. Create stock_out from vehicle (negative Qty)
            StockInHand::create([
                'RefNo' => $payload['ref'] ?? 'VEH-UNLOAD',
                'company_code' => $companyCode,
                'owner_company_code' => $companyCode,
                'section_code' => null, // Source is vehicle
                'vehicle_id' => $vehicleId,
                'OrdDate' => now()->format('Y-m-d'),
                'ItemKy' => $itemKy,
                'Qty' => -$quantity,
                'FreeQty' => 0,
                'TrnTyp' => 'VUNLOAD-OUT',
                'OrdKy' => $vehicleId,
                'batch_no' => $batchNo,
            ]);

            // 3. Create stock_in to section (positive Qty)
            StockInHand::create([
                'RefNo' => $payload['ref'] ?? 'VEH-UNLOAD',
                'company_code' => $companyCode,
                'owner_company_code' => $companyCode,
                'section_code' => $sectionCode,
                'OrdDate' => now()->format('Y-m-d'),
                'ItemKy' => $itemKy,
                'Qty' => $quantity,
                'FreeQty' => 0,
                'TrnTyp' => 'VUNLOAD-IN',
                'OrdKy' => $vehicleId,
                'batch_no' => $batchNo,
            ]);

            return $vs;
        });
    }
}
