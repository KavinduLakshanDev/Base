<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Models\Vehicle;
use App\Models\Delivery;
use App\Models\DeliveryItem;
use App\Models\User;

class VehicleStockReportController extends Controller
{
    /**
     * Show vehicle stock report (snapshot as at selected date + deliveries that day)
     */
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('reports.vehicle_stock') && !request()->user()->hasPermission('stock.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = request()->user();
        $companyCode = $user->company_code;
        // company model for header
        $company = $user->company ?? \App\Models\Company::where('company_code', $companyCode)->first();
        if (! $company) { $company = (object)['company_name' => '']; }


        $date = $request->query('date', date('Y-m-d'));
        $vehicleId = $request->query('vehicle_id', null);
        $preferredTime = $request->query('preferred_time', null); // expected format HH:MM (24h)

        // Vehicles for the filter dropdown
        $vehicles = Vehicle::where('company_code', $companyCode)
            ->where('is_active', true)
            ->with('assignedUser:id,first_name,last_name')
            ->orderBy('name')
            ->get(['id', 'name', 'registration_no', 'assigned_user_id']);

        // Sales reps (for optional filter / display)
        $salesReps = User::where('company_code', $companyCode)
            ->whereHas('role', fn($q) => $q->where('level', 'sales_rep'))
            ->select('id', 'first_name', 'last_name')
            ->orderBy('first_name')
            ->get();

        $stockRows = [];
        $deliveries = [];
        $routesVisited = [];

        $kpis = [
            'total_stock_items' => 0,
            'distinct_skus' => 0,
            'deliveries_count' => 0,
            'deliveries_total' => 0.0,
        ];

        if ($vehicleId) {
            // Snapshot of vehicle stock as at selected date/time (aggregate StockInHand movements for vehicle)
            // If preferred_time provided we limit same-day movements to created_at <= selected datetime to approximate "as at time".
            $stockQuery = DB::table('stock_in_hand as s')
                ->leftJoin('itemmaster as im', 's.ItemKy', '=', 'im.ItmKy')
                ->where('s.company_code', $companyCode)
                ->where('s.vehicle_id', $vehicleId)
                ->when($preferredTime, function ($q) use ($date, $preferredTime) {
                    // cutoff timestamp (assume server timezone matches stored timestamps)
                    $cutoff = $date . ' ' . $preferredTime . ':00';
                    $q->where(function ($qq) use ($date, $cutoff) {
                        $qq->whereDate('s.OrdDate', '<', $date)
                           ->orWhere(function ($q2) use ($date, $cutoff) {
                               $q2->whereDate('s.OrdDate', '=', $date)
                                  ->where('s.created_at', '<=', $cutoff);
                           });
                    });
                }, function ($q) use ($date) {
                    $q->whereDate('s.OrdDate', '<=', $date);
                })
                ->select('s.ItemKy', 'im.ItemCode', 'im.ItmNm', 's.batch_no', DB::raw('SUM(s.Qty) as qty'), DB::raw('MAX(s.OrdDate) as last_date'))
                ->groupBy('s.ItemKy', 'im.ItemCode', 'im.ItmNm', 's.batch_no')
                ->havingRaw('SUM(s.Qty) <> 0')
                ->orderBy('im.ItmNm');

            $stockRows = $stockQuery->get()->map(function ($r) {
                return [
                    'item_ky' => $r->ItemKy,
                    'item_code' => $r->ItemCode ?? '',
                    'item_name' => $r->ItmNm ?? 'Unknown',
                    'batch_no' => $r->batch_no ?? null,
                    'quantity' => (float) $r->qty,
                    'last_date' => $r->last_date,
                ];
            })->toArray();

            $kpis['total_stock_items'] = collect($stockRows)->sum('quantity');
            $kpis['distinct_skus'] = collect($stockRows)->pluck('item_ky')->unique()->count();

            // Deliveries for the vehicle on that date (optionally filter to preferred_time)
            $deliveriesQuery = Delivery::with(['deliveryRoute:id,name','assignedUser:id,first_name,last_name','items'])
                ->where('company_code', $companyCode)
                ->where('vehicle_id', $vehicleId)
                ->whereDate('delivery_date', $date)
                ->when($preferredTime, fn($q) => $q->where('delivery_time', $preferredTime))
                ->orderBy('delivery_number');

            $deliveryRows = $deliveriesQuery->get();

            $deliveries = $deliveryRows->map(function ($d) {
                $itemsCount = $d->items->sum(fn($it) => (float) $it->quantity);
                $totalAmount = $d->items->sum(fn($it) => (float) ($it->total_amount ?? ($it->quantity * $it->unit_price ?? 0)));
                return [
                    'id' => $d->id,
                    'delivery_number' => $d->delivery_number,
                    'route_name' => $d->deliveryRoute?->name ?? null,
                    'sales_rep' => $d->assignedUser ? ($d->assignedUser->first_name . ' ' . $d->assignedUser->last_name) : null,
                    'assigned_user_id' => $d->assigned_user_id,
                    'items_count' => $itemsCount,
                    'total_amount' => $totalAmount,
                    'status' => $d->status,
                ];
            })->toArray();

            $kpis['deliveries_count'] = count($deliveries);
            $kpis['deliveries_total'] = array_sum(array_column($deliveries, 'total_amount'));

            $routesVisited = collect($deliveries)->pluck('route_name')->filter()->unique()->values()->toArray();

            // assigned sales reps at that preferred time (if any)
            $assignedSalesReps = collect($deliveries)->pluck('sales_rep')->filter()->unique()->values()->toArray();
        }

        return Inertia::render('Reports/VehicleStockReport', [
            'company' => [
                'name' => $company->company_name ?: '',
            ],
            'vehicles' => $vehicles,
            'salesReps' => $salesReps,
            'filters' => $request->only(['date', 'vehicle_id', 'preferred_time']),
            'selected_vehicle_id' => $vehicleId,
            'date' => $date,
            'preferred_time' => $preferredTime,
            'stockRows' => $stockRows,
            'deliveries' => $deliveries,
            'routesVisited' => $routesVisited,
            'assignedSalesReps' => $assignedSalesReps ?? [],
            'kpis' => $kpis,
        ]);
    }

    /**
     * Export CSV for the selected vehicle/date
     */
    public function export(Request $request)
    {
        if (!request()->user()->hasPermission('reports.vehicle_stock') && !request()->user()->hasPermission('stock.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = request()->user();
        $companyCode = $user->company_code;
        // also attach company even though not used later
        $company = $user->company ?? \App\Models\Company::where('company_code', $companyCode)->first();
        if (! $company) { $company = (object)['company_name' => '']; }


        $date = $request->query('date', date('Y-m-d'));
        $vehicleId = $request->query('vehicle_id');
        $preferredTime = $request->query('preferred_time', null);

        if (!$vehicleId) {
            return redirect()->back()->with('error', 'Please select a vehicle to export.');
        }

        $vehicle = Vehicle::where('company_code', $companyCode)->find($vehicleId);
        if (!$vehicle) abort(404);

        // Fetch stock snapshot (same as index)
        $stockQuery = DB::table('stock_in_hand as s')
            ->leftJoin('itemmaster as im', 's.ItemKy', '=', 'im.ItmKy')
            ->where('s.company_code', $companyCode)
            ->where('s.vehicle_id', $vehicleId)
            ->when($preferredTime, function ($q) use ($date, $preferredTime) {
                $cutoff = $date . ' ' . $preferredTime . ':00';
                $q->where(function ($qq) use ($date, $cutoff) {
                    $qq->whereDate('s.OrdDate', '<', $date)
                       ->orWhere(function ($q2) use ($date, $cutoff) {
                           $q2->whereDate('s.OrdDate', '=', $date)
                              ->where('s.created_at', '<=', $cutoff);
                       });
                });
            }, function ($q) use ($date) {
                $q->whereDate('s.OrdDate', '<=', $date);
            })
            ->select('im.ItemCode', 'im.ItmNm', 's.batch_no', DB::raw('SUM(s.Qty) as qty'))
            ->groupBy('im.ItemCode', 'im.ItmNm', 's.batch_no')
            ->havingRaw('SUM(s.Qty) <> 0')
            ->orderBy('im.ItmNm')
            ->get();

        $filename = 'vehicle-stock-' . $vehicle->id . '-' . $date . '.csv';

        $callback = function () use ($stockQuery, $vehicle, $date) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ["Vehicle", $vehicle->name, "Date", $date]);
            fputcsv($out, []);
            fputcsv($out, ['Item Code', 'Item Name', 'Batch', 'Quantity']);

            foreach ($stockQuery as $r) {
                fputcsv($out, [$r->ItemCode, $r->ItmNm, $r->batch_no ?? '', (float) $r->qty]);
            }

            fclose($out);
        };

        return response()->streamDownload($callback, $filename, ['Content-Type' => 'text/csv']);
    }
}
