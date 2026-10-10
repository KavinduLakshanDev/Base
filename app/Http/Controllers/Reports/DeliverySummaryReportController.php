<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\Shop;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeliverySummaryReportController extends Controller
{
    use DeliveryReportHelpers;

    public function index(Request $request)
    {
        $unauthorized = $this->authorizeReport('reports.delivery_summary');
        if ($unauthorized) return $unauthorized;

        $companyCode = $this->getCompanyCode();
        $filters = $this->extractDateFilters($request);
        $vehicleId = $request->input('vehicle_id');
        $shopId = $request->input('shop_id');
        $status = $request->input('status');

        $query = $this->buildDeliveryQuery($companyCode, $filters);

        if ($vehicleId && $vehicleId !== 'all') $query->where('vehicle_id', $vehicleId);
        if ($shopId && $shopId !== 'all') $query->where('shop_id', $shopId);
        if ($status && $status !== 'all') $query->where('status', $status);

        $deliveries = $query->with(['items', 'payments', 'deliveryRoute', 'assignedUser'])->get();

        $totalDeliveries = $deliveries->count();
        $assignedCount = $deliveries->where('status', 'assigned')->count();
        $deliveringCount = $deliveries->where('status', 'delivering')->count();
        $deliveredCount = $deliveries->where('status', 'delivered')->count();
        $cancelledCount = $deliveries->where('status', 'cancelled')->count();
        $totalItems = $deliveries->sum(fn($d) => $d->items->sum('quantity'));
        $totalValue = $deliveries->sum(fn($d) => $d->items->sum('total_amount'));
        $totalPaid = $deliveries->sum(fn($d) => $d->payments->sum('amount'));
        $outstanding = $totalValue - $totalPaid;

        $byRoute = $deliveries->groupBy('delivery_route_id')->map(function ($group) {
            $route = $group->first()->deliveryRoute;
            return [
                'route_id' => $group->first()->delivery_route_id,
                'route_name' => $route->name ?? 'N/A',
                'count' => $group->count(),
                'total_value' => $group->sum(fn($d) => $d->items->sum('total_amount')),
            ];
        })->values();

        $byRep = $deliveries->groupBy('assigned_user_id')->map(function ($group) {
            $rep = $group->first()->assignedUser;
            return [
                'rep_id' => $group->first()->assigned_user_id,
                'rep_name' => $rep ? "{$rep->first_name} {$rep->last_name}" : 'Unassigned',
                'count' => $group->count(),
                'total_value' => $group->sum(fn($d) => $d->items->sum('total_amount')),
            ];
        })->values();

        $dropdowns = $this->getFilterDropdowns($companyCode);
        $vehicles = Vehicle::where('company_code', $companyCode)->where('is_active', true)->get();
        $shops = Shop::where('company_code', $companyCode)->where('is_active', true)->get();

        return Inertia::render('Reports/DeliverySummary', [
            'summary' => [
                'total_deliveries' => $totalDeliveries,
                'assigned' => $assignedCount,
                'delivering' => $deliveringCount,
                'delivered' => $deliveredCount,
                'cancelled' => $cancelledCount,
                'total_items' => $totalItems,
                'total_value' => $totalValue,
                'total_paid' => $totalPaid,
                'outstanding' => $outstanding,
            ],
            'by_route' => $byRoute,
            'by_rep' => $byRep,
            'filters' => array_merge($this->buildFilterParams($filters), compact('vehicleId', 'shopId', 'status')),
            'routes' => $dropdowns['routes'],
            'salesReps' => $dropdowns['salesReps'],
            'vehicles' => $vehicles,
            'shops' => $shops,
        ]);
    }

    public function export(Request $request)
    {
        $unauthorized = $this->authorizeReport('reports.delivery_summary');
        if ($unauthorized) return $unauthorized;

        $companyCode = $this->getCompanyCode();
        $filters = $this->extractDateFilters($request);
        $vehicleId = $request->input('vehicle_id');
        $shopId = $request->input('shop_id');
        $status = $request->input('status');

        $query = $this->buildDeliveryQuery($companyCode, $filters);
        if ($vehicleId) $query->where('vehicle_id', $vehicleId);
        if ($shopId) $query->where('shop_id', $shopId);
        if ($status) $query->where('status', $status);

        $deliveries = $query->with(['items', 'payments', 'deliveryRoute', 'assignedUser'])->get();

        $csvData = [
            ['Delivery Summary Report'],
            ['Date Range', "{$filters['dateFrom']} to {$filters['dateTo']}"],
            [],
            ['Delivery #', 'Customer', 'Route', 'Sales Rep', 'Date', 'Status', 'Items', 'Value', 'Paid', 'Outstanding'],
        ];

        foreach ($deliveries as $d) {
            $totalValue = $d->items->sum('total_amount');
            $paid = $d->payments->sum('amount');
            $outstanding = $totalValue - $paid;

            $csvData[] = [
                $d->delivery_number,
                $d->customer_name,
                $d->deliveryRoute->name ?? 'N/A',
                $d->assignedUser ? "{$d->assignedUser->first_name} {$d->assignedUser->last_name}" : 'Unassigned',
                $d->delivery_date,
                ucfirst($d->status),
                $d->items->sum('quantity'),
                'Rs. ' . number_format($totalValue, 2),
                'Rs. ' . number_format($paid, 2),
                'Rs. ' . number_format($outstanding, 2),
            ];
        }

        return $this->returnCsv($csvData, "delivery_summary_{$filters['dateFrom']}_to_{$filters['dateTo']}.csv");
    }
}
