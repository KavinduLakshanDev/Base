<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\DeliveryRoute;
use App\Models\User;

class DeliveryProfitReportController extends Controller
{
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('reports.delivery_profit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;

        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $groupBy = $request->input('group_by', 'item'); // item | route | rep
        $routeId = $request->input('route_id');
        $repId = $request->input('rep_id');

        $base = DB::table('delivery_items as di')
            ->join('deliveries as d', 'di.delivery_id', '=', 'd.id')
            ->leftJoin('itemmaster as im', function ($j) {
                $j->on('im.ItmKy', '=', 'di.ItmKy')->on('im.batch_no', '=', 'di.batch_no');
            })
            // fallback: use itemmaster row without batch or with 'DEFAULT' when exact batch missing
            ->leftJoin('itemmaster as im_def', function ($j) {
                $j->on('im_def.ItmKy', '=', 'di.ItmKy')
                  ->whereNull('im_def.batch_no')
                  ->orWhere('im_def.batch_no', 'DEFAULT')
                  ->orWhere('im_def.batch_no', '');
            })
            ->where('d.company_code', $companyCode)
            ->whereBetween('d.delivery_date', [$dateFrom, $dateTo])
            ->when($routeId && $routeId !== 'all', fn($q) => $q->where('d.delivery_route_id', $routeId))
            ->when($repId && $repId !== 'all', fn($q) => $q->where('d.assigned_user_id', $repId));

        // select/group depending on groupBy
        if ($groupBy === 'route') {
            $rows = (clone $base)
                ->selectRaw('d.delivery_route_id as group_id, COALESCE(im.ItmKy, di.ItmKy) as itmky, COALESCE(im.ItemCode, di.ItemCode) as item_code, COALESCE(im.ItmNm, di.ItemName) as item_name, SUM(di.quantity) as qty, SUM(di.quantity * di.unit_price) as sales_value, SUM(di.quantity * COALESCE(im.CosPri, im.NCostPrice, im_def.CosPri, im_def.NCostPrice, 0)) as cost_value')
                ->groupBy('d.delivery_route_id', 'di.ItmKy', 'im.ItmKy', 'im.ItemCode', 'im.ItmNm', 'di.ItemCode', 'di.ItemName')
                ->get();

            $grouped = $rows->groupBy('group_id')->map(function ($group, $routeId) {
                return $group->map(fn($r) => [
                    'itmky' => $r->itmky,
                    'item_code' => $r->item_code,
                    'item_name' => $r->item_name,
                    'qty' => (float) $r->qty,
                    'sales_value' => (float) $r->sales_value,
                    'cost_value' => (float) $r->cost_value,
                    'profit' => (float) ($r->sales_value - $r->cost_value),
                    'margin_pct' => ((float) $r->sales_value) ? (((((float) $r->sales_value) - ((float) $r->cost_value)) / ((float) $r->sales_value)) * 100) : null,
                ]);
            });

            $summary = $rows->reduce(function ($carry, $r) {
                $carry['total_sales'] += (float) $r->sales_value;
                $carry['total_cost'] += (float) $r->cost_value;
                $carry['total_profit'] += (float) ($r->sales_value - $r->cost_value);
                return $carry;
            }, ['total_sales' => 0.0, 'total_cost' => 0.0, 'total_profit' => 0.0]);

            $data = [
                'by_group' => $grouped,
                'summary' => $summary,
                'filters' => compact('dateFrom','dateTo','groupBy','routeId','repId'),
            ];
        } elseif ($groupBy === 'rep') {
            $rows = (clone $base)
                ->selectRaw('d.assigned_user_id as group_id, COALESCE(im.ItmKy, di.ItmKy) as itmky, COALESCE(im.ItemCode, di.ItemCode) as item_code, COALESCE(im.ItmNm, di.ItemName) as item_name, SUM(di.quantity) as qty, SUM(di.quantity * di.unit_price) as sales_value, SUM(di.quantity * COALESCE(im.CosPri, im.NCostPrice, im_def.CosPri, im_def.NCostPrice, 0)) as cost_value')
                ->groupBy('d.assigned_user_id', 'di.ItmKy', 'im.ItmKy', 'im.ItemCode', 'im.ItmNm', 'di.ItemCode', 'di.ItemName')
                ->get();

            $grouped = $rows->groupBy('group_id')->map(function ($group, $repId) {
                return $group->map(fn($r) => [
                    'itmky' => $r->itmky,
                    'item_code' => $r->item_code,
                    'item_name' => $r->item_name,
                    'qty' => (float) $r->qty,
                    'sales_value' => (float) $r->sales_value,
                    'cost_value' => (float) $r->cost_value,
                    'profit' => (float) ($r->sales_value - $r->cost_value),
                    'margin_pct' => ((float) $r->sales_value) ? (((((float) $r->sales_value) - ((float) $r->cost_value)) / ((float) $r->sales_value)) * 100) : null,
                ]);
            });

            $summary = $rows->reduce(function ($carry, $r) {
                $carry['total_sales'] += (float) $r->sales_value;
                $carry['total_cost'] += (float) $r->cost_value;
                $carry['total_profit'] += (float) ($r->sales_value - $r->cost_value);
                return $carry;
            }, ['total_sales' => 0.0, 'total_cost' => 0.0, 'total_profit' => 0.0]);

            $data = [
                'by_group' => $grouped,
                'summary' => $summary,
                'filters' => compact('dateFrom','dateTo','groupBy','routeId','repId'),
            ];
        } else {
            // default: group by item
            $rows = (clone $base)
                ->selectRaw('COALESCE(im.ItmKy, di.ItmKy) as itmky, COALESCE(im.ItemCode, di.ItemCode) as item_code, COALESCE(im.ItmNm, di.ItemName) as item_name, SUM(di.quantity) as qty, SUM(di.quantity * di.unit_price) as sales_value, SUM(di.quantity * COALESCE(im.CosPri, im.NCostPrice, im_def.CosPri, im_def.NCostPrice, 0)) as cost_value')
                ->groupBy('di.ItmKy', 'im.ItmKy', 'im.ItemCode', 'im.ItmNm', 'di.ItemCode', 'di.ItemName')
                ->orderByDesc('qty')
                ->get();

            $items = $rows->map(fn($r) => [
                'itmky' => $r->itmky,
                'item_code' => $r->item_code,
                'item_name' => $r->item_name,
                'qty' => (float) $r->qty,
                'sales_value' => (float) $r->sales_value,
                'cost_value' => (float) $r->cost_value,
                'profit' => (float) ($r->sales_value - $r->cost_value),
                'margin_pct' => ((float) $r->sales_value) ? (((((float) $r->sales_value) - ((float) $r->cost_value)) / ((float) $r->sales_value)) * 100) : null,
            ]);

            $summary = $rows->reduce(function ($carry, $r) {
                $carry['total_sales'] += (float) $r->sales_value;
                $carry['total_cost'] += (float) $r->cost_value;
                $carry['total_profit'] += (float) ($r->sales_value - $r->cost_value);
                return $carry;
            }, ['total_sales' => 0.0, 'total_cost' => 0.0, 'total_profit' => 0.0]);

            $data = [
                'items' => $items,
                'summary' => $summary,
                'filters' => compact('dateFrom','dateTo','groupBy','routeId','repId'),
            ];
        }

        // dropdown data
        $routes = DeliveryRoute::where('company_code', $companyCode)->where('is_active', true)->get();
        $salesReps = User::where('company_code', $companyCode)->whereHas('role', function($q){ $q->where('level','sales_rep'); })->where('is_active', true)->get();

        return Inertia::render('Reports/DeliveryProfitReport', array_merge($data, [
            'routes' => $routes,
            'salesReps' => $salesReps,
        ]));
    }

    public function export(Request $request)
    {
        if (!request()->user()->hasPermission('reports.delivery_profit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;

        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $groupBy = $request->input('group_by', 'item');
        $routeId = $request->input('route_id');
        $repId = $request->input('rep_id');

        $base = DB::table('delivery_items as di')
            ->join('deliveries as d', 'di.delivery_id', '=', 'd.id')
            ->leftJoin('itemmaster as im', function ($j) {
                $j->on('im.ItmKy', '=', 'di.ItmKy')->on('im.batch_no', '=', 'di.batch_no');
            })
            // fallback: use itemmaster row without batch or with 'DEFAULT' when exact batch missing
            ->leftJoin('itemmaster as im_def', function ($j) {
                $j->on('im_def.ItmKy', '=', 'di.ItmKy')
                  ->whereNull('im_def.batch_no')
                  ->orWhere('im_def.batch_no', 'DEFAULT')
                  ->orWhere('im_def.batch_no', '');
            })
            ->where('d.company_code', $companyCode)
            ->whereBetween('d.delivery_date', [$dateFrom, $dateTo])
            ->when($routeId && $routeId !== 'all', fn($q) => $q->where('d.delivery_route_id', $routeId))
            ->when($repId && $repId !== 'all', fn($q) => $q->where('d.assigned_user_id', $repId));

        $rows = (clone $base)
            ->selectRaw('COALESCE(im.ItemCode, di.ItemCode) as item_code, COALESCE(im.ItmNm, di.ItemName) as item_name, SUM(di.quantity) as qty, SUM(di.quantity * di.unit_price) as sales_value, SUM(di.quantity * COALESCE(im.CosPri, im.NCostPrice, im_def.CosPri, im_def.NCostPrice, 0)) as cost_value')
            ->groupBy('di.ItmKy', 'im.ItemCode', 'im.ItmNm', 'di.ItemCode', 'di.ItemName')
            ->orderByDesc('qty')
            ->get();

        $csv = [];
        $csv[] = ['Delivery Profit Report'];
        $csv[] = ['Date Range', "{$dateFrom} to {$dateTo}"];
        $csv[] = [];
        $csv[] = ['Item Code', 'Item Name', 'Qty', 'Sales (Rs.)', 'Cost (Rs.)', 'Profit (Rs.)', 'Margin (%)'];

        foreach ($rows as $r) {
            $sales = (float) $r->sales_value;
            $cost = (float) $r->cost_value;
            $profit = $sales - $cost;
            $margin = $sales ? ($profit / $sales) * 100 : null;

            $csv[] = [
                $r->item_code,
                $r->item_name,
                (float) $r->qty,
                'Rs. ' . number_format($sales, 2),
                'Rs. ' . number_format($cost, 2),
                'Rs. ' . number_format($profit, 2),
                $margin !== null ? number_format($margin, 2) . '%' : '',
            ];
        }

        $filename = "delivery_profit_{$dateFrom}_to_{$dateTo}.csv";
        $handle = fopen('php://output', 'w');
        ob_start();
        foreach ($csv as $row) {
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
