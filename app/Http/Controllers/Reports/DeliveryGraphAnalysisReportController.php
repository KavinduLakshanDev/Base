<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\DeliveryPayment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeliveryGraphAnalysisReportController extends Controller
{
    use DeliveryReportHelpers;

    public function index(Request $request)
    {
        $unauthorized = $this->authorizeReport('reports.delivery_graph_analysis');
        if ($unauthorized) return $unauthorized;

        $companyCode = $this->getCompanyCode();
        $filters = $this->extractDateFilters($request);
        $deliveries = $this->buildDeliveryQuery($companyCode, $filters, ['items', 'payments', 'assignedUser', 'deliveryRoute'])->get();

        $paymentsQuery = DeliveryPayment::where('company_code', $companyCode)
            ->whereBetween('payment_date', [$filters['dateFrom'], $filters['dateTo']]);

        if (!empty($filters['routeId']) && $filters['routeId'] !== 'all') {
            $paymentsQuery->whereHas('delivery', fn($q) => $q->where('delivery_route_id', $filters['routeId']));
        }
        if (!empty($filters['repId']) && $filters['repId'] !== 'all') {
            $paymentsQuery->whereHas('delivery', fn($q) => $q->where('assigned_user_id', $filters['repId']));
        }
        $payments = $paymentsQuery->get();

        $totalDeliveries = $deliveries->count();
        $totalItems = $deliveries->sum(fn($d) => $d->items->sum('quantity'));
        $totalSales = $deliveries->sum(fn($d) => $d->items->sum('total_amount'));
        $totalCollections = $payments->sum('amount');
        $outstanding = $totalSales - $totalCollections;

        $byRoute = $deliveries->groupBy('delivery_route_id')->map(function ($group) {
            $route = $group->first()->deliveryRoute;
            return [
                'route_id' => $group->first()->delivery_route_id,
                'route_name' => $route->name ?? 'N/A',
                'deliveries' => $group->count(),
                'items' => $group->sum(fn($d) => $d->items->sum('quantity')),
                'sales' => $group->sum(fn($d) => $d->items->sum('total_amount')),
            ];
        })->values();

        $byRep = $deliveries->groupBy('assigned_user_id')->map(function ($group) {
            $rep = $group->first()->assignedUser;
            return [
                'rep_id' => $group->first()->assigned_user_id,
                'rep_name' => $rep ? trim($rep->first_name . ' ' . $rep->last_name) : 'Unassigned',
                'deliveries' => $group->count(),
                'items' => $group->sum(fn($d) => $d->items->sum('quantity')),
                'sales' => $group->sum(fn($d) => $d->items->sum('total_amount')),
            ];
        })->values();

        $timeSeries = collect();
        $period = \Carbon\CarbonPeriod::create($filters['dateFrom'], $filters['dateTo']);
        foreach ($period as $dt) {
            $dateStr = $dt->format('Y-m-d');
            $dayDeliveries = $deliveries->filter(fn($d) => $d->delivery_date === $dateStr);
            $dayPayments = $payments->filter(fn($p) => $p->payment_date === $dateStr);
            $timeSeries->push([
                'date' => $dateStr,
                'deliveries' => $dayDeliveries->count(),
                'items' => $dayDeliveries->sum(fn($d) => $d->items->sum('quantity')),
                'sales' => $dayDeliveries->sum(fn($d) => $d->items->sum('total_amount')),
                'collections' => $dayPayments->sum('amount'),
            ]);
        }

        $dropdowns = $this->getFilterDropdowns($companyCode);

        return Inertia::render('Reports/DeliveryGraphAnalysisReport', [
            'summary' => compact('totalDeliveries', 'totalItems', 'totalSales', 'totalCollections', 'outstanding'),
            'time_series' => $timeSeries,
            'by_route' => $byRoute,
            'by_rep' => $byRep,
            'filters' => $this->buildFilterParams($filters),
            'routes' => $dropdowns['routes'],
            'salesReps' => $dropdowns['salesReps'],
        ]);
    }

    public function export(Request $request)
    {
        $unauthorized = $this->authorizeReport('reports.delivery_graph_analysis');
        if ($unauthorized) return $unauthorized;

        $companyCode = $this->getCompanyCode();
        $filters = $this->extractDateFilters($request);
        $deliveries = $this->buildDeliveryQuery($companyCode, $filters, ['items'])->get();

        $paymentsQuery = DeliveryPayment::where('company_code', $companyCode)
            ->whereBetween('payment_date', [$filters['dateFrom'], $filters['dateTo']]);

        if (!empty($filters['routeId']) && $filters['routeId'] !== 'all') {
            $paymentsQuery->whereHas('delivery', fn($q) => $q->where('delivery_route_id', $filters['routeId']));
        }
        if (!empty($filters['repId']) && $filters['repId'] !== 'all') {
            $paymentsQuery->whereHas('delivery', fn($q) => $q->where('assigned_user_id', $filters['repId']));
        }
        $payments = $paymentsQuery->get();

        $csvData = [
            ['Delivery Graph Analysis Report'],
            ['Date Range', "{$filters['dateFrom']} to {$filters['dateTo']}"],
            [],
            ['Date', 'Deliveries', 'Items', 'Sales (Rs.)', 'Collections (Rs.)'],
        ];

        $period = \Carbon\CarbonPeriod::create($filters['dateFrom'], $filters['dateTo']);
        foreach ($period as $dt) {
            $dateStr = $dt->format('Y-m-d');
            $dayDeliveries = $deliveries->filter(fn($d) => $d->delivery_date === $dateStr);
            $dayPayments = $payments->filter(fn($p) => $p->payment_date === $dateStr);
            $csvData[] = [
                $dateStr,
                $dayDeliveries->count(),
                $dayDeliveries->sum(fn($d) => $d->items->sum('quantity')),
                'Rs. ' . number_format($dayDeliveries->sum(fn($d) => $d->items->sum('total_amount')), 2),
                'Rs. ' . number_format($dayPayments->sum('amount'), 2),
            ];
        }

        return $this->returnCsv($csvData, "delivery_graph_analysis_{$filters['dateFrom']}_to_{$filters['dateTo']}.csv");
    }
}
