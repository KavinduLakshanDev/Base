<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeliverySaleInvoiceReportController extends Controller
{
    use DeliveryReportHelpers;

    public function index(Request $request)
    {
        $unauthorized = $this->authorizeReport('reports.delivery_sales');
        if ($unauthorized) return $unauthorized;

        $companyCode = $this->getCompanyCode();
        $filters = $this->extractDateFilters($request);
        $deliveries = $this->buildDeliveryQuery($companyCode, $filters, ['items', 'assignedUser', 'deliveryRoute', 'payments'])
            ->orderBy('delivery_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $summary = $this->computeSummary($deliveries);
        $payments = $this->computePaymentBreakdown($deliveries);

        $byInvoice = $deliveries->map(function ($d) {
            $paymentMethod = '';
            if ($d->payments && $d->payments->count() > 0) {
                $paymentMethod = ucfirst($d->payments->first()->method);
            } elseif ($d->total_amount > 0 && $d->paid_amount == 0) {
                $paymentMethod = 'Credit';
            }

            return [
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
                'payment_method' => $paymentMethod,
                'items' => $d->items->map(fn($it) => [
                    'item_code' => $it->ItemCode ?? '',
                    'item_name' => $it->ItemName ?? 'Item',
                    'quantity' => $it->quantity,
                    'unit_price' => $it->unit_price,
                    'line_total' => $it->total_amount ?? ($it->quantity * $it->unit_price),
                ])->values(),
            ];
        })->values();

        $dropdowns = $this->getFilterDropdowns($companyCode);

        return Inertia::render('Reports/DeliverySaleInvoiceReport', [
            'summary' => array_merge($summary, $payments, ['credit_total' => $summary['outstanding']]),
            'by_invoice' => $byInvoice,
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
        $deliveries = $this->buildDeliveryQuery($companyCode, $filters, ['items', 'assignedUser', 'deliveryRoute', 'payments'])
            ->orderBy('delivery_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $csvData = [
            ['Delivery Sale Invoices Report'],
            ['Date Range', "{$filters['dateFrom']} to {$filters['dateTo']}"],
            [],
            ['Date', 'Invoice No', 'Invoice Date', 'Route', 'Sales Rep', 'Customer', 'Payment Method', 'Total Sales (Rs.)', 'Paid (Rs.)', 'Outstanding (Rs.)'],
        ];

        foreach ($deliveries as $d) {
            $paymentMethod = '';
            if ($d->payments && $d->payments->count() > 0) {
                $paymentMethod = ucfirst($d->payments->first()->method);
            } elseif ($d->total_amount > 0 && $d->paid_amount == 0) {
                $paymentMethod = 'Credit';
            }

            $csvData[] = [
                $d->delivery_date,
                $d->delivery_number,
                $d->delivery_date,
                $d->deliveryRoute->name ?? 'N/A',
                $d->assignedUser ? trim($d->assignedUser->first_name . ' ' . $d->assignedUser->last_name) : 'Unassigned',
                $d->customer_name,
                $paymentMethod,
                number_format($d->total_amount, 2),
                number_format($d->paid_amount, 2),
                number_format(max(0, $d->total_amount - $d->paid_amount), 2),
            ];
        }

        return $this->returnCsv($csvData, "delivery_sale_invoices_{$filters['dateFrom']}_to_{$filters['dateTo']}.csv");
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
