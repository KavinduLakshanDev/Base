<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeliverySalesReportController extends Controller
{
    use DeliveryReportHelpers;

    public function index(Request $request)
    {
        $unauthorized = $this->authorizeReport('reports.delivery_sales');
        if ($unauthorized) return $unauthorized;

        $companyCode = $this->getCompanyCode();
        $filters = $this->extractDateFilters($request);
        $deliveries = $this->buildDeliveryQuery($companyCode, $filters, ['items', 'assignedUser', 'deliveryRoute'])->get();

        $summary = $this->computeSummary($deliveries);
        $payments = $this->computePaymentBreakdown($deliveries);
        $byItem = $this->computeItemBreakdown($deliveries);

        $byRoute = $deliveries->groupBy('delivery_route_id')->map(function ($group) {
            $route = $group->first()->deliveryRoute;
            $itemsGrouped = $group->flatMap(fn($d) => $d->items->map(fn($it) => [
                'name' => $it->ItemName ?? $it->item_name ?? $it->item_code ?? $it->ItemCode ?? 'Item',
                'quantity' => $it->quantity,
            ]))->groupBy('name')->map(fn($items, $name) => [
                'name' => $name,
                'quantity' => $items->sum('quantity'),
            ])->values()->toArray();

            $itemsDetails = $group->flatMap(fn($d) => $d->items->map(fn($it) => [
                'delivery_number' => $d->delivery_number,
                'name' => $it->ItemName ?? $it->item_name ?? $it->item_code ?? $it->ItemCode ?? 'Item',
                'item_code' => $it->item_code ?? $it->ItemCode ?? null,
                'batch_no' => $it->batch_no ?? null,
                'quantity' => $it->quantity,
                'unit_price' => $it->unit_price ?? null,
                'total_amount' => $it->total_amount ?? null,
            ]))->values()->toArray();

            $totalSales = $group->sum(fn($d) => $d->total_amount);
            $totalPaid = $group->sum(fn($d) => $d->paid_amount);
            $deliveriesCount = $group->count();

            return [
                'route_id' => $group->first()->delivery_route_id,
                'route_name' => $route->name ?? 'N/A',
                'deliveries' => $deliveriesCount,
                'items' => $group->sum(fn($d) => $d->items->sum('quantity')),
                'items_list' => $itemsGrouped,
                'items_details' => $itemsDetails,
                'sales' => $totalSales,
                'paid' => $totalPaid,
                'outstanding' => max(0, $totalSales - $totalPaid),
                'recovery_rate' => $totalSales > 0 ? round(($totalPaid / $totalSales) * 100, 2) : 0,
                'avg_ticket' => $deliveriesCount > 0 ? round($totalSales / $deliveriesCount, 2) : 0,
            ];
        })->values();

        $byRep = $deliveries->groupBy('assigned_user_id')->map(function ($group) {
            $rep = $group->first()->assignedUser;
            $itemsGrouped = $group->flatMap(fn($d) => $d->items->map(fn($it) => [
                'name' => $it->ItemName ?? $it->item_name ?? $it->item_code ?? $it->ItemCode ?? 'Item',
                'quantity' => $it->quantity,
            ]))->groupBy('name')->map(fn($items, $name) => [
                'name' => $name,
                'quantity' => $items->sum('quantity'),
            ])->values()->toArray();

            $itemsDetails = $group->flatMap(fn($d) => $d->items->map(fn($it) => [
                'delivery_number' => $d->delivery_number,
                'name' => $it->ItemName ?? $it->item_name ?? $it->item_code ?? $it->ItemCode ?? 'Item',
                'item_code' => $it->item_code ?? $it->ItemCode ?? null,
                'batch_no' => $it->batch_no ?? null,
                'quantity' => $it->quantity,
                'unit_price' => $it->unit_price ?? null,
                'total_amount' => $it->total_amount ?? null,
            ]))->values()->toArray();

            $totalSales = $group->sum(fn($d) => $d->total_amount);
            $totalPaid = $group->sum(fn($d) => $d->paid_amount);
            $deliveriesCount = $group->count();

            return [
                'rep_id' => $group->first()->assigned_user_id,
                'rep_name' => $rep ? trim($rep->first_name . ' ' . $rep->last_name) : 'Unassigned',
                'deliveries' => $deliveriesCount,
                'items' => $group->sum(fn($d) => $d->items->sum('quantity')),
                'items_list' => $itemsGrouped,
                'items_details' => $itemsDetails,
                'sales' => $totalSales,
                'paid' => $totalPaid,
                'outstanding' => max(0, $totalSales - $totalPaid),
                'recovery_rate' => $totalSales > 0 ? round(($totalPaid / $totalSales) * 100, 2) : 0,
                'avg_ticket' => $deliveriesCount > 0 ? round($totalSales / $deliveriesCount, 2) : 0,
            ];
        })->values();

        $byInvoice = $deliveries->map(fn($d) => [
            'delivery_id' => $d->id,
            'delivery_number' => $d->delivery_number,
            'delivery_date' => $d->delivery_date,
            'route_name' => $d->deliveryRoute->name ?? 'N/A',
            'rep_name' => $d->assignedUser ? trim($d->assignedUser->first_name . ' ' . $d->assignedUser->last_name) : 'Unassigned',
            'customer_name' => $d->customer_name ?? 'N/A',
            'items_count' => $d->items->sum('quantity'),
            'total_amount' => $d->total_amount,
            'paid_amount' => $d->paid_amount,
            'outstanding' => max(0, $d->total_amount - $d->paid_amount),
        ])->values();

        $timeSeries = collect();
        $period = \Carbon\CarbonPeriod::create($filters['dateFrom'], $filters['dateTo']);
        foreach ($period as $dt) {
            $dateStr = $dt->format('Y-m-d');
            $dayDeliveries = $deliveries->filter(fn($d) => $d->delivery_date === $dateStr);
            $timeSeries->push([
                'date' => $dateStr,
                'sales' => $dayDeliveries->sum(fn($d) => $d->total_amount),
                'items' => $dayDeliveries->sum(fn($d) => $d->items->sum('quantity')),
                'deliveries' => $dayDeliveries->count(),
            ]);
        }

        $dropdowns = $this->getFilterDropdowns($companyCode);

        return Inertia::render('Reports/DeliverySalesReport', [
            'summary' => array_merge($summary, $payments, ['credit_total' => $summary['outstanding']]),
            'by_route' => $byRoute,
            'by_rep' => $byRep,
            'by_invoice' => $byInvoice,
            'by_item' => $byItem,
            'time_series' => $timeSeries,
            'filters' => $this->buildFilterParams($filters),
            'routes' => $dropdowns['routes'],
            'salesReps' => $dropdowns['salesReps'],
        ]);
    }

    public function export(Request $request)
    {
        $unauthorized = $this->authorizeReport('reports.delivery_sales');
        if ($unauthorized) return $unauthorized;

        $companyCode = $this->getCompanyCode();
        $filters = $this->extractDateFilters($request);
        $deliveries = $this->buildDeliveryQuery($companyCode, $filters, ['items', 'assignedUser', 'deliveryRoute'])->get();

        $tab = $request->input('tab', 'invoice');

        $csvData = [
            ['Delivery Sales Report'],
            ['Date Range', "{$filters['dateFrom']} to {$filters['dateTo']}"],
            [],
        ];

        if ($tab === 'item') {
            $csvData[] = ['Item Code', 'Item Name', 'Total Qty Sold', 'Avg Price (Rs.)', 'Total Sales (Rs.)'];
            $byItem = $this->computeItemBreakdown($deliveries);
            foreach ($byItem as $it) {
                $csvData[] = [
                    $it['item_code'],
                    $it['item_name'],
                    $it['quantity'],
                    number_format($it['avg_price'], 2),
                    number_format($it['total_amount'], 2),
                ];
            }
            $filename = "delivery_sales_item_wise_{$filters['dateFrom']}_to_{$filters['dateTo']}.csv";
        } else {
            $csvData[] = ['Date', 'Delivery #', 'Route', 'Sales Rep', 'Customer', 'Items Count', 'Items', 'Total Sales (Rs.)', 'Paid (Rs.)', 'Outstanding (Rs.)'];
            foreach ($deliveries as $d) {
                $itemsDesc = $d->items->map(fn($it) => ($it->ItemName ?? $it->item_name ?? $it->ItemCode ?? 'Item') . " ({$it->quantity})")->implode(', ');
                $csvData[] = [
                    $d->delivery_date,
                    $d->delivery_number,
                    $d->deliveryRoute->name ?? 'N/A',
                    $d->assignedUser ? trim($d->assignedUser->first_name . ' ' . $d->assignedUser->last_name) : 'Unassigned',
                    $d->customer_name,
                    $d->items->sum('quantity'),
                    $itemsDesc,
                    number_format($d->total_amount, 2),
                    number_format($d->paid_amount, 2),
                    number_format(max(0, $d->total_amount - $d->paid_amount), 2),
                ];
            }
            $filename = "delivery_sales_{$tab}_wise_{$filters['dateFrom']}_to_{$filters['dateTo']}.csv";
        }

        return $this->returnCsv($csvData, $filename);
    }

    public function items(Request $request)
    {
        $unauthorized = $this->authorizeReport('reports.delivery_sales');
        if ($unauthorized) return $unauthorized;

        $items = json_decode($request->input('items'), true);

        return Inertia::render('Reports/DeliverySalesItems', [
            'items' => $items,
        ]);
    }
}
