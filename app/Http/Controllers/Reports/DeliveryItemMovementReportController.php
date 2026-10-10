<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\DeliveryRoute;
use App\Models\User;

class DeliveryItemMovementReportController extends Controller
{
    /**
     * Display fast / slow moving items report for deliveries
     */
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('reports.delivery_item_movement')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;

        // Filters
        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $groupBy = $request->input('group_by', 'global'); // global | route | rep
        $routeId = $request->input('route_id');
        $repId = $request->input('rep_id');
        $topN = intval($request->input('top_n', 20));

        // Base aggregated query (global)
        $base = DB::table('delivery_items as di')
            ->join('deliveries as d', 'di.delivery_id', '=', 'd.id')
            ->leftJoin('itemmaster as im', function ($j) {
                $j->on('im.ItmKy', '=', 'di.ItmKy')->on('im.batch_no', '=', 'di.batch_no');
            })
            ->where('d.company_code', $companyCode)
            ->whereBetween('d.delivery_date', [$dateFrom, $dateTo])
            ->when($routeId && $routeId !== 'all', fn($q) => $q->where('d.delivery_route_id', $routeId))
            ->when($repId && $repId !== 'all', fn($q) => $q->where('d.assigned_user_id', $repId));

        // Global top items
        $itemsQuery = (clone $base)
            ->selectRaw('di.ItmKy as itmky, COALESCE(im.ItemCode, di.ItemCode) as item_code, COALESCE(im.ItmNm, di.ItemName) as item_name, SUM(di.quantity) as qty_sold, SUM(di.total_amount) as revenue, (CASE WHEN SUM(di.quantity) = 0 THEN 0 ELSE SUM(di.total_amount)/SUM(di.quantity) END) as avg_price')
            ->groupBy('di.ItmKy', 'im.ItemCode', 'im.ItmNm', 'di.ItemCode', 'di.ItemName')
            ->orderByDesc('qty_sold')
            ->limit(max(1, $topN));

        $items = $itemsQuery->get()->map(function ($r) {
            return [
                'itmky' => $r->itmky,
                'item_code' => $r->item_code,
                'item_name' => $r->item_name,
                'qty_sold' => (float) $r->qty_sold,
                'revenue' => (float) $r->revenue,
                'avg_price' => (float) $r->avg_price,
                'movement_category' => null, // will fill on frontend (fast/slow) or via heuristic if needed
            ];
        });

        // Totals
        $totals = (clone $base)
            ->selectRaw('COALESCE(SUM(di.quantity),0) as total_qty, COALESCE(SUM(di.total_amount),0) as total_revenue')
            ->first();

        // Grouped (route / rep) results — top N per group when requested
        $byGroup = [];
        if ($groupBy === 'route') {
            $groupRows = (clone $base)
                ->selectRaw('d.delivery_route_id as group_id, di.ItmKy as itmky, COALESCE(im.ItemCode, di.ItemCode) as item_code, COALESCE(im.ItmNm, di.ItemName) as item_name, SUM(di.quantity) as qty_sold, SUM(di.total_amount) as revenue')
                ->groupBy('d.delivery_route_id', 'di.ItmKy', 'im.ItemCode', 'im.ItmNm', 'di.ItemCode', 'di.ItemName')
                ->orderByDesc('qty_sold')
                ->get()
                ->groupBy('group_id');

            foreach ($groupRows as $groupId => $rows) {
                $byGroup[(string)$groupId] = $rows->take($topN)->map(fn($r) => [
                    'itmky' => $r->itmky,
                    'item_code' => $r->item_code,
                    'item_name' => $r->item_name,
                    'qty_sold' => (float) $r->qty_sold,
                    'revenue' => (float) $r->revenue,
                    'avg_price' => $r->qty_sold ? ($r->revenue / $r->qty_sold) : 0,
                ])->values();
            }
        } elseif ($groupBy === 'rep') {
            $groupRows = (clone $base)
                ->selectRaw('d.assigned_user_id as group_id, di.ItmKy as itmky, COALESCE(im.ItemCode, di.ItemCode) as item_code, COALESCE(im.ItmNm, di.ItemName) as item_name, SUM(di.quantity) as qty_sold, SUM(di.total_amount) as revenue')
                ->groupBy('d.assigned_user_id', 'di.ItmKy', 'im.ItemCode', 'im.ItmNm', 'di.ItemCode', 'di.ItemName')
                ->orderByDesc('qty_sold')
                ->get()
                ->groupBy('group_id');

            foreach ($groupRows as $groupId => $rows) {
                $byGroup[(string)$groupId] = $rows->take($topN)->map(fn($r) => [
                    'itmky' => $r->itmky,
                    'item_code' => $r->item_code,
                    'item_name' => $r->item_name,
                    'qty_sold' => (float) $r->qty_sold,
                    'revenue' => (float) $r->revenue,
                    'avg_price' => $r->qty_sold ? ($r->revenue / $r->qty_sold) : 0,
                ])->values();
            }
        }

        // Dropdown data
        $routes = DeliveryRoute::where('company_code', $companyCode)->where('is_active', true)->get();
        $salesReps = User::where('company_code', $companyCode)
            ->whereHas('role', function ($q) { $q->where('level', 'sales_rep'); })
            ->where('is_active', true)
            ->get();

        return Inertia::render('Reports/DeliveryItemMovement', [
            'items' => $items,
            'by_group' => $byGroup,
            'summary' => [
                'total_qty' => (float) ($totals->total_qty ?? 0),
                'total_revenue' => (float) ($totals->total_revenue ?? 0),
            ],
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'group_by' => $groupBy,
                'route_id' => $routeId,
                'rep_id' => $repId,
                'top_n' => $topN,
            ],
            'routes' => $routes,
            'salesReps' => $salesReps,
        ]);
    }

    /**
     * CSV export for the report
     */
    public function export(Request $request)
    {
        if (!request()->user()->hasPermission('reports.delivery_item_movement')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;

        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $routeId = $request->input('route_id');
        $repId = $request->input('rep_id');

        $base = DB::table('delivery_items as di')
            ->join('deliveries as d', 'di.delivery_id', '=', 'd.id')
            ->leftJoin('itemmaster as im', function ($j) {
                $j->on('im.ItmKy', '=', 'di.ItmKy')->on('im.batch_no', '=', 'di.batch_no');
            })
            ->where('d.company_code', $companyCode)
            ->whereBetween('d.delivery_date', [$dateFrom, $dateTo])
            ->when($routeId && $routeId !== 'all', fn($q) => $q->where('d.delivery_route_id', $routeId))
            ->when($repId && $repId !== 'all', fn($q) => $q->where('d.assigned_user_id', $repId));

        $rows = (clone $base)
            ->selectRaw('COALESCE(im.ItemCode, di.ItemCode) as item_code, COALESCE(im.ItmNm, di.ItemName) as item_name, SUM(di.quantity) as qty_sold, SUM(di.total_amount) as revenue, (CASE WHEN SUM(di.quantity)=0 THEN 0 ELSE SUM(di.total_amount)/SUM(di.quantity) END) as avg_price')
            ->groupBy('di.ItmKy', 'im.ItemCode', 'im.ItmNm', 'di.ItemCode', 'di.ItemName')
            ->orderByDesc('qty_sold')
            ->get();

        $csvData = [];
        $csvData[] = ['Fast / Slow Moving Items Report'];
        $csvData[] = ['Date Range', "{$dateFrom} to {$dateTo}"];
        $csvData[] = [];
        $csvData[] = ['Item Code', 'Item Name', 'Qty Sold', 'Revenue', 'Avg Unit Price', 'Movement Category'];

        foreach ($rows as $r) {
            $qty = (float) $r->qty_sold;
            $revenue = (float) $r->revenue;
            $avg = (float) $r->avg_price;

            $csvData[] = [
                $r->item_code,
                $r->item_name,
                $qty,
                'Rs. ' . number_format($revenue, 2),
                'Rs. ' . number_format($avg, 2),
                '',
            ];
        }

        $filename = "delivery_item_movement_{$dateFrom}_to_{$dateTo}.csv";
        $handle = fopen('php://output', 'w');
        ob_start();

        foreach ($csvData as $row) {
            fputcsv($handle, $row);
        }

        fclose($handle);
        $csvContent = ob_get_clean();

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
