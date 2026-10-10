<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\DeliveryPayment;
use App\Models\DeliveryRoute;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Inertia\Inertia;

class DeliveryCollectionReportController extends Controller
{
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('reports.delivery_collection')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view delivery reports.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;

        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $repId = $request->input('rep_id');
        $routeId = $request->input('route_id');
        $paymentMethod = $request->input('payment_method');
        $compare = $request->boolean('compare_with_previous', true);

        // Current period payments
        $paymentsQuery = DeliveryPayment::with(['delivery.assignedUser'])
            ->where('company_code', $companyCode)
            ->whereBetween('payment_date', [$dateFrom, $dateTo]);

        if ($routeId && $routeId !== 'all') {
            $paymentsQuery->whereHas('delivery', function ($q) use ($routeId) {
                $q->where('delivery_route_id', $routeId);
            });
        }

        if ($repId && $repId !== 'all') {
            $paymentsQuery->whereHas('delivery', function ($q) use ($repId) {
                $q->where('assigned_user_id', $repId);
            });
        }

        if ($paymentMethod && $paymentMethod !== 'all') {
            $paymentsQuery->where('method', $paymentMethod);
        }

        $payments = $paymentsQuery->get();

        // Previous period (for comparison)
        $previousPayments = collect();
        if ($compare) {
            $days = Carbon::parse($dateFrom)->diffInDays(Carbon::parse($dateTo)) + 1;
            $prevFrom = Carbon::parse($dateFrom)->subDays($days)->format('Y-m-d');
            $prevTo = Carbon::parse($dateFrom)->subDay()->format('Y-m-d');

            $prevQuery = DeliveryPayment::with(['delivery.assignedUser'])
                ->where('company_code', $companyCode)
                ->whereBetween('payment_date', [$prevFrom, $prevTo]);

            if ($routeId && $routeId !== 'all') {
                $prevQuery->whereHas('delivery', function ($q) use ($routeId) {
                    $q->where('delivery_route_id', $routeId);
                });
            }

            if ($repId && $repId !== 'all') {
                $prevQuery->whereHas('delivery', function ($q) use ($repId) {
                    $q->where('assigned_user_id', $repId);
                });
            }

            if ($paymentMethod && $paymentMethod !== 'all') {
                $prevQuery->where('method', $paymentMethod);
            }

            $previousPayments = $prevQuery->get();
        }

        // Helper: aggregate by rep and method
        $aggregate = function ($collection) {
            $result = [];
            foreach ($collection as $p) {
                if ($p->status === 'bounced') continue; // skip bounced cheques
                
                $repId = $p->delivery && $p->delivery->assigned_user_id ? $p->delivery->assigned_user_id : 'unassigned';
                $method = $p->method ?? 'unknown';
                $amount = (float) $p->amount;

                $result[$repId]['methods'][$method] = ($result[$repId]['methods'][$method] ?? 0) + $amount;
                $result[$repId]['total'] = ($result[$repId]['total'] ?? 0) + $amount;
            }
            return $result;
        };

        $currentAgg = $aggregate($payments);
        $prevAgg = $aggregate($previousPayments);

        // Build by_rep array (union of reps in both periods)
        $repIds = array_unique(array_merge(array_keys($currentAgg), array_keys($prevAgg)));

        $byRep = [];
        foreach ($repIds as $rId) {
            $rep = null;
            if ($rId !== 'unassigned') {
                $rep = User::find($rId);
            }
            $thisTotal = $currentAgg[$rId]['total'] ?? 0;
            $prevTotal = $prevAgg[$rId]['total'] ?? 0;
            $delta = $prevTotal > 0 ? round((($thisTotal - $prevTotal) / $prevTotal) * 100, 2) : ($thisTotal > 0 ? 100.0 : 0.0);

            $byRep[] = [
                'rep_id' => $rId === 'unassigned' ? null : $rId,
                'rep_name' => $rep ? trim($rep->first_name . ' ' . $rep->last_name) : 'Unassigned',
                'this_period' => $thisTotal,
                'previous_period' => $prevTotal,
                'delta_percent' => $delta,
                'methods' => $currentAgg[$rId]['methods'] ?? [],
                'previous_methods' => $prevAgg[$rId]['methods'] ?? [],
            ];
        }

        // Summary and method totals
        $summary = [
            'total_collections' => (float) $payments->where('status', '!=', 'bounced')->sum('amount'),
            'payment_methods' => [
                'cash' => (float) $payments->where('method', 'cash')->where('status', '!=', 'bounced')->sum('amount'),
                'card' => (float) $payments->where('method', 'card')->where('status', '!=', 'bounced')->sum('amount'),
                'transfer' => (float) $payments->where('method', 'transfer')->where('status', '!=', 'bounced')->sum('amount'),
                'cheque' => (float) $payments->where('method', 'cheque')->where('status', '!=', 'bounced')->sum('amount'),
                'service_charge' => (float) $payments->where('method', 'service_charge')->sum('amount'),
            ],
        ];

        $routes = DeliveryRoute::where('company_code', $companyCode)->where('is_active', true)->get();
        $salesReps = User::where('company_code', $companyCode)
            ->whereHas('role', function($q) { $q->where('level', 'sales_rep'); })
            ->where('is_active', true)
            ->get();

        $paymentMethods = ['all', 'cash', 'cheque', 'transfer', 'service_charge'];

        return Inertia::render('Reports/DeliveryCollectionReport', [
            'summary' => $summary,
            'by_rep' => $byRep,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'rep_id' => $repId,
                'route_id' => $routeId,
                'payment_method' => $paymentMethod,
                'compare_with_previous' => $compare,
            ],
            'payment_methods' => $paymentMethods,
            'salesReps' => $salesReps,
            'routes' => $routes,
        ]);
    }

    public function export(Request $request)
    {
        if (!request()->user()->hasPermission('reports.delivery_collection')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;

        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $repId = $request->input('rep_id');
        $routeId = $request->input('route_id');
        $paymentMethod = $request->input('payment_method');
        $compare = $request->boolean('compare_with_previous', true);

        $paymentsQuery = DeliveryPayment::with(['delivery.assignedUser'])
            ->where('company_code', $companyCode)
            ->whereBetween('payment_date', [$dateFrom, $dateTo]);

        if ($routeId && $routeId !== 'all') {
            $paymentsQuery->whereHas('delivery', function ($q) use ($routeId) {
                $q->where('delivery_route_id', $routeId);
            });
        }

        if ($repId && $repId !== 'all') {
            $paymentsQuery->whereHas('delivery', function ($q) use ($repId) {
                $q->where('assigned_user_id', $repId);
            });
        }

        if ($paymentMethod && $paymentMethod !== 'all') {
            $paymentsQuery->where('method', $paymentMethod);
        }

        $payments = $paymentsQuery->get();

        // previous period for CSV (optional)
        $days = Carbon::parse($dateFrom)->diffInDays(Carbon::parse($dateTo)) + 1;
        $prevFrom = Carbon::parse($dateFrom)->subDays($days)->format('Y-m-d');
        $prevTo = Carbon::parse($dateFrom)->subDay()->format('Y-m-d');

        $prevQuery = DeliveryPayment::with(['delivery.assignedUser'])
            ->where('company_code', $companyCode)
            ->whereBetween('payment_date', [$prevFrom, $prevTo]);

        if ($routeId && $routeId !== 'all') {
            $prevQuery->whereHas('delivery', function ($q) use ($routeId) {
                $q->where('delivery_route_id', $routeId);
            });
        }

        if ($repId && $repId !== 'all') {
            $prevQuery->whereHas('delivery', function ($q) use ($repId) {
                $q->where('assigned_user_id', $repId);
            });
        }

        if ($paymentMethod && $paymentMethod !== 'all') {
            $prevQuery->where('method', $paymentMethod);
        }

        $previousPayments = $prevQuery->get();

        // Build CSV rows grouped by rep + method
        $currentAgg = [];
        foreach ($payments as $p) {
            $rId = $p->delivery && $p->delivery->assigned_user_id ? $p->delivery->assigned_user_id : 'unassigned';
            $method = $p->method ?? 'unknown';
            $currentAgg[$rId][$method] = ($currentAgg[$rId][$method] ?? 0) + $p->amount;
        }

        $prevAgg = [];
        foreach ($previousPayments as $p) {
            $rId = $p->delivery && $p->delivery->assigned_user_id ? $p->delivery->assigned_user_id : 'unassigned';
            $method = $p->method ?? 'unknown';
            $prevAgg[$rId][$method] = ($prevAgg[$rId][$method] ?? 0) + $p->amount;
        }

        $rows = [];
        $rows[] = ['Sales Rep', 'Payment Method', 'This Period (Rs.)', 'Previous Period (Rs.)', 'Change (%)'];

        $repIds = array_unique(array_merge(array_keys($currentAgg), array_keys($prevAgg)));
        foreach ($repIds as $rid) {
            $repName = 'Unassigned';
            if ($rid !== 'unassigned') {
                $u = User::find($rid);
                $repName = $u ? trim($u->first_name . ' ' . $u->last_name) : 'Unassigned';
            }
            $methods = array_unique(array_merge(array_keys($currentAgg[$rid] ?? []), array_keys($prevAgg[$rid] ?? [])));
            foreach ($methods as $m) {
                $thisVal = $currentAgg[$rid][$m] ?? 0;
                $prevVal = $prevAgg[$rid][$m] ?? 0;
                $change = $prevVal > 0 ? round((($thisVal - $prevVal) / $prevVal) * 100, 2) : ($thisVal > 0 ? 100.0 : 0.0);
                $rows[] = [$repName, $m, 'Rs. ' . number_format($thisVal, 2), 'Rs. ' . number_format($prevVal, 2), $change . '%'];
            }
        }

        $filename = "delivery_collections_{$dateFrom}_to_{$dateTo}.csv";
        $handle = fopen('php://output', 'w');
        ob_start();
        foreach ($rows as $row) {
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
