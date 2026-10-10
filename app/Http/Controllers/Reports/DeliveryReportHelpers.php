<?php

namespace App\Http\Controllers\Reports;

use App\Models\Delivery;
use App\Models\DeliveryRoute;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

trait DeliveryReportHelpers
{
    protected function authorizeReport(string $permission): ?\Illuminate\Http\RedirectResponse
    {
        if (!request()->user()->hasPermission($permission)) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view delivery reports.');
        }
        return null;
    }

    protected function getCompanyCode(): string
    {
        return Auth::user()->company_code;
    }

    protected function extractDateFilters(Request $request): array
    {
        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $routeId = $request->input('route_id');
        $repId = $request->input('rep_id');
        $granularity = $request->input('granularity', 'daily');

        if ($routeId && !is_numeric($routeId)) {
            $routeId = null;
        }
        if ($repId && !is_numeric($repId)) {
            $repId = null;
        }

        return compact('dateFrom', 'dateTo', 'routeId', 'repId', 'granularity');
    }

    protected function buildDeliveryQuery(string $companyCode, array $filters, array $withRelations = []): \Illuminate\Database\Eloquent\Builder
    {
        $query = Delivery::query()
            ->where('company_code', $companyCode)
            ->whereBetween('delivery_date', [$filters['dateFrom'], $filters['dateTo']]);

        if (!empty($withRelations)) {
            $query->with($withRelations);
        }

        if (!empty($filters['routeId']) && $filters['routeId'] !== 'all') {
            $query->where('delivery_route_id', intval($filters['routeId']));
        }
        if (!empty($filters['repId']) && $filters['repId'] !== 'all') {
            $query->where('assigned_user_id', intval($filters['repId']));
        }

        return $query;
    }

    protected function computeSummary($deliveries): array
    {
        $totalDeliveries = $deliveries->count();
        $totalItems = $deliveries->sum(fn($d) => $d->items->sum('quantity'));
        $totalSales = $deliveries->sum(fn($d) => $d->total_amount);
        $totalPaid = $deliveries->sum(fn($d) => $d->paid_amount);
        $outstanding = max(0, $totalSales - $totalPaid);

        return [
            'total_deliveries' => $totalDeliveries,
            'total_items' => $totalItems,
            'total_sales' => $totalSales,
            'total_paid' => $totalPaid,
            'outstanding' => $outstanding,
        ];
    }

    protected function computePaymentBreakdown($deliveries): array
    {
        $cashTotal = 0;
        $chequeTotal = 0;
        $cardTotal = 0;
        $bankTotal = 0;

        foreach ($deliveries as $d) {
            foreach ($d->payments as $p) {
                if ($p->status === 'bounced') continue;
                $amt = (float) $p->amount;
                if ($p->method === 'cash') $cashTotal += $amt;
                elseif ($p->method === 'cheque') $chequeTotal += $amt;
                elseif ($p->method === 'card') $cardTotal += $amt;
                elseif ($p->method === 'transfer') $bankTotal += $amt;
            }
        }

        return [
            'cash_total' => $cashTotal,
            'cheque_total' => $chequeTotal,
            'card_total' => $cardTotal,
            'bank_total' => $bankTotal,
        ];
    }

    protected function computeItemBreakdown($deliveries): array
    {
        return $deliveries->flatMap(fn($d) => $d->items)
            ->groupBy('ItemCode')
            ->map(function ($itemsGroup, $itemCode) {
                $first = $itemsGroup->first();
                $qty = $itemsGroup->sum('quantity');
                $amount = $itemsGroup->sum('total_amount');
                return [
                    'item_code' => $itemCode ?? $first->item_code ?? 'N/A',
                    'item_name' => $first->ItemName ?? $first->item_name ?? 'N/A',
                    'quantity' => $qty,
                    'total_amount' => $amount,
                    'avg_price' => $qty > 0 ? round($amount / $qty, 2) : 0,
                ];
            })->values()->toArray();
    }

    protected function getFilterDropdowns(string $companyCode): array
    {
        $routes = DeliveryRoute::where('company_code', $companyCode)->where('is_active', true)->get();
        $salesReps = User::where('company_code', $companyCode)
            ->whereHas('role', fn($q) => $q->where('level', 'sales_rep'))
            ->where('is_active', true)
            ->get();

        return compact('routes', 'salesReps');
    }

    protected function buildFilterParams(array $filters): array
    {
        return [
            'date_from' => $filters['dateFrom'],
            'date_to' => $filters['dateTo'],
            'route_id' => $filters['routeId'],
            'rep_id' => $filters['repId'],
            'granularity' => $filters['granularity'] ?? 'daily',
        ];
    }

    protected function returnCsv(array $csvData, string $filename): \Symfony\Component\HttpFoundation\Response
    {
        $handle = fopen('php://output', 'w');
        ob_start();
        foreach ($csvData as $row) {
            fputcsv($handle, $row);
        }
        fclose($handle);
        $content = ob_get_clean();

        return response($content, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
