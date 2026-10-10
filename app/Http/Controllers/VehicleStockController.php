<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\Section;
use App\Services\VehicleStockService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VehicleStockController extends Controller
{
    protected $stockService;

    public function __construct(VehicleStockService $stockService)
    {
        $this->stockService = $stockService;
    }

    public function index(Vehicle $vehicle)
    {
        if (!request()->user()->hasPermission('vehicle_stock.view') && !request()->user()->hasPermission('stock.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($vehicle->company_code !== request()->user()->company_code) abort(404);

        // Sum returned quantities from ShopReturnItem per (item_ky, batch_no) for this vehicle.
        // This is the direct source of truth — reads what was actually recorded as returned.
        $returnedMap = \App\Models\ShopReturnItem::whereHas('shopReturn.delivery', fn ($q) => $q->where('vehicle_id', $vehicle->id))
            ->selectRaw('item_ky, COALESCE(batch_no, \'\') as batch_key, SUM(quantity) as total_returned')
            ->groupBy('item_ky', 'batch_key')
            ->get()
            ->keyBy(fn ($r) => $r->item_ky . '|' . $r->batch_key);

        $stocks = $vehicle->stocks()->with('item')->get()->map(function ($s) use ($returnedMap) {
            $loaded    = (float) ($s->loaded_quantity > 0 ? $s->loaded_quantity : ($s->quantity + $s->delivered_quantity));
            $delivered = (float) $s->delivered_quantity;
            $available = (float) ($s->quantity - $s->reserved_quantity);
            $key       = $s->item_ky . '|' . ($s->batch_no ?? '');
            $returned  = (float) ($returnedMap[$key]->total_returned ?? 0);
            return [
                'id'               => $s->id,
                'item_ky'          => $s->item_ky,
                'item_name'        => $s->item?->ItmNm ?? 'Unknown',
                'item_code'        => $s->item?->ItemCode ?? '',
                'batch_no'         => $s->batch_no,
                'quantity'         => $loaded,
                'delivered'        => $delivered,
                'returned'         => $returned,
                'reserved'         => (float) $s->reserved_quantity,
                'available'        => $available,
                'last_date'        => $s->last_date,
            ];
        });

        $sections = Section::where('company_code', $vehicle->company_code)
            ->orderByRaw('is_main_stock DESC, name ASC')
            ->get(['id', 'section_code', 'name']);

        return Inertia::render('delivery/vehicles/stock', [
            'vehicle'  => $vehicle,
            'stocks'   => $stocks,
            'sections' => $sections,
        ]);
    }

    public function load(Request $request, Vehicle $vehicle)
    {
        if (!request()->user()->hasPermission('vehicle_stock.manage') && !request()->user()->hasPermission('stock.transfer')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($vehicle->company_code !== request()->user()->company_code) abort(404);

        $request->validate([
            'section_code' => 'required|string',
            'section_id' => 'nullable|integer',
            'item_ky' => 'required|integer',
            'batch_no' => 'required|string',
            'quantity' => 'required|numeric|min:0.01',
        ]);

        $payload = $request->only(['vehicle_id', 'section_code', 'section_id', 'item_ky', 'batch_no', 'quantity']);
        $payload['vehicle_id'] = $vehicle->id;
        $payload['company_code'] = request()->user()->company_code;

        $vs = $this->stockService->loadToVehicle($payload);

        return redirect()->back()->with('success', 'Stock loaded successfully.');
    }

    public function unload(Request $request, Vehicle $vehicle)
    {
        if (!request()->user()->hasPermission('vehicle_stock.manage') && !request()->user()->hasPermission('stock.transfer')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($vehicle->company_code !== request()->user()->company_code) abort(404);

        $request->validate([
            'item_ky' => 'required|integer',
            'batch_no' => 'required|string',
            'quantity' => 'required|numeric|min:0.01',
            'section_code' => 'required|string', // Return to this section
        ]);

        $payload = $request->only(['item_ky', 'batch_no', 'quantity', 'section_code']);
        $payload['vehicle_id'] = $vehicle->id;
        $payload['company_code'] = request()->user()->company_code;

        $this->stockService->unloadFromVehicle($payload);

        return redirect()->back()->with('success', 'Stock unloaded successfully.');
    }
    public function history(Request $request, Vehicle $vehicle, $itemKy, $batchNo = null)
    {
        // Permission check
        if (!request()->user()->hasPermission('vehicle_stock.view') && !request()->user()->hasPermission('stock.view')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($vehicle->company_code !== request()->user()->company_code) abort(404);

        $batchNo = ($batchNo === 'null' || $batchNo === 'undefined') ? null : $batchNo;

        // Fetch deliveries for this vehicle, item, and batch
        // We join DeliveryItem with Delivery to get the shop/customer info
        $items = \App\Models\DeliveryItem::where('ItmKy', $itemKy)
            ->where('batch_no', $batchNo)
            ->whereHas('delivery', function($q) use ($vehicle) {
                $q->where('vehicle_id', $vehicle->id);
            })
            ->with(['delivery' => function($q) {
                $q->select('id', 'delivery_number', 'customer_name', 'shop_id', 'delivery_date', 'status');
            }, 'delivery.shop'])
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'date' => $item->delivery->delivery_date,
                    'delivery_number' => $item->delivery->delivery_number,
                    'customer' => $item->delivery->shop ? $item->delivery->shop->name : $item->delivery->customer_name,
                    'quantity' => (float) $item->quantity,
                    'status' => $item->delivery->status,
                ];
            });

        return response()->json($items);
    }
}
