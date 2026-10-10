<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeliverySaleItemsReportController extends Controller
{
    use DeliveryReportHelpers;

    public function index(Request $request)
    {
        $unauthorized = $this->authorizeReport('reports.delivery_sales');
        if ($unauthorized) return $unauthorized;

        $companyCode = $this->getCompanyCode();
        $filters = $this->extractDateFilters($request);
        $deliveries = $this->buildDeliveryQuery($companyCode, $filters, ['items', 'assignedUser', 'deliveryRoute'])->get();

        $summary = array_merge(
            $this->computeSummary($deliveries),
            $this->computePaymentBreakdown($deliveries),
            ['credit_total' => 0]
        );
        $byItem = $this->computeItemBreakdown($deliveries);
        $dropdowns = $this->getFilterDropdowns($companyCode);

        return Inertia::render('Reports/DeliverySaleItemsReport', [
            'summary' => $summary,
            'by_item' => $byItem,
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

        $byItem = $this->computeItemBreakdown($deliveries);

        $csvData = [
            ['Delivery Sale Items Report'],
            ['Date Range', "{$filters['dateFrom']} to {$filters['dateTo']}"],
            [],
            ['Item Code', 'Item Name', 'Total Qty Sold', 'Avg Price (Rs.)', 'Total Sales (Rs.)'],
        ];

        foreach ($byItem as $it) {
            $csvData[] = [
                $it['item_code'],
                $it['item_name'],
                $it['quantity'],
                number_format($it['avg_price'], 2),
                number_format($it['total_amount'], 2),
            ];
        }

        return $this->returnCsv($csvData, "delivery_sale_items_{$filters['dateFrom']}_to_{$filters['dateTo']}.csv");
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
