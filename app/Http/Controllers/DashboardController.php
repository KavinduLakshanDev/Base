<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionItem;
use App\Models\ServiceJob;
use App\Models\ItemMaster;
use App\Models\StockInHand;
use App\Models\Delivery;
use App\Models\DeliveryPayment;
use App\Models\Vehicle;
use App\Models\VehicleStock;
use App\Models\CustomerReturn;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // Sales rep should be redirected to their dedicated dashboard (take precedence over permission checks)
        if ($user->role && $user->role->level === 'sales_rep') {
            return redirect()->route('dashboard.sales-rep');
        }

        // Check if user is a Technician
        if ($user->role && $user->role->level === 'technician') {
            $stats = $this->getTechnicianStats();
            return Inertia::render('dashboard', [
                'stats' => $stats,
                'role' => 'technician'
            ]);
        }

        // Check if user is a Stock Manager
        if ($user->role && $user->role->level === 'stock_manager') {
            $stats = $this->getStockManagerStats();
            return Inertia::render('dashboard', [
                'stats' => $stats,
                'role' => 'stock_manager'
            ]);
        }

        // Check if user has permission to view sales dashboard (Cashier/Admin)
        if ($user->hasPermission('dashboard.view') || ($user->role && in_array($user->role->level, ['cashier', 'admin', 'company_admin', 'super_admin']))) {
            $stats = $this->getCashierStats();
            return Inertia::render('dashboard', [
                'stats' => $stats,
                'role' => 'cashier'
            ]);
        }

        if (auth()->guard('company')->check()) {
            return redirect()->route('company.dashboard');
        }

        return Inertia::render('dashboard');
    }

    private function getCashierStats()
    {
        $today = now()->startOfDay();
        $endOfDay = now()->endOfDay();
        $user = Auth::user();
        $sectionCode = $user->section_code ?? 'MAIN';

        // 1. Today's Sales Stats
        $salesQuery = SalesTransaction::query()
            ->whereBetween('transaction_date', [$today, $endOfDay])
            ->where('status', '!=', 'cancelled');
            
        if ($sectionCode && $sectionCode !== 'MAIN') {
             $salesQuery->where('section_code', $sectionCode);
        }

        // restrict to cashier's own transactions unless user is company/admin
        if ($user->role && $user->role->level === 'cashier') {
            $salesQuery->where('cashier_id', $user->id);
        }

        $salesForStats = (clone $salesQuery)->get();
        $totalSales = $salesForStats->sum('total_amount');
        $transactionCount = $salesForStats->count();
        
        $paymentSplit = [
            'cash' => 0,
            'card' => 0,
            'cheque' => 0,
            'bank_transfer' => 0,
            'points' => 0,
            'credit' => 0
        ];

        foreach ($salesForStats as $s) {
            $pd = $s->payment_details;
            $paymentSplit['cash'] += (float)($pd['cash'] ?? 0);
            $paymentSplit['card'] += (float)($pd['card'] ?? 0);
            $paymentSplit['cheque'] += (float)($pd['cheque'] ?? 0);
            $paymentSplit['bank_transfer'] += (float)($pd['bank_transfer'] ?? 0);
            $paymentSplit['points'] += (float)($pd['points'] ?? 0);
            $paymentSplit['credit'] += (float)($s->balance_amount ?? 0);
        }

        // 1b. Today's Returns
        $returnsQuery = CustomerReturn::query()
            ->whereBetween('return_date', [$today, $endOfDay])
            ->where('status', '!=', 'cancelled');
            
        if ($sectionCode && $sectionCode !== 'MAIN') {
             $returnsQuery->where('section_code', $sectionCode);
        }

        $totalReturns = $returnsQuery->sum('total_return_amount');


        // 2. Service Jobs Ready for Collection
        $readyForCollectionQuery = ServiceJob::where('status', 'completed');
        
        if ($user->role_id !== 1) {
            $readyForCollectionQuery->where('company_code', $user->company_code);
        } else {
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $readyForCollectionQuery->where('company_code', $selectedCompany);
            } else {
                $readyForCollectionQuery->whereRaw('1 = 0');
            }
        }
        
        $readyForCollection = $readyForCollectionQuery->count();

        // 3. Low Stock Alerts
        // Get items where valid stock < reorder level
        $lowStockItems = ItemMaster::query()
            ->select('itemmaster.*')
            ->selectRaw('(select sum(`stock_in_hand`.`Qty`) from `stock_in_hand` where `itemmaster`.`ItmKy` = `stock_in_hand`.`ItemKy` and `section_code` = ?) as current_stock', [$sectionCode])
            ->where('Status', 'A')
            ->where('ReOrdlLvl', '>', 0)
            ->where('section_code', $sectionCode)
            ->whereRaw('(select sum(`stock_in_hand`.`Qty`) from `stock_in_hand` where `itemmaster`.`ItmKy` = `stock_in_hand`.`ItemKy` and `section_code` = ?) < `ReOrdlLvl`', [$sectionCode])
            ->take(5)
            ->get()
            ->map(function($item) {
                return [
                    'item_code' => $item->ItemCode,
                    'name' => $item->ItmNm,
                    'current_stock' => $item->current_stock ?? 0,
                    'reorder_level' => $item->ReOrdlLvl,
                ];
            });

        // 4. Top Selling Items (Today)
        // This requires joining sales_transaction_items with sales_transactions to filter by date
        $topSellingItems = SalesTransactionItem::query()
            ->join('sales_transactions', 'sales_transaction_items.sales_transaction_id', '=', 'sales_transactions.id')
            ->leftJoin('itemmaster', function ($join) {
                $join->on(function($q) {
                    $q->on('itemmaster.ItmKy', '=', 'sales_transaction_items.product_id')
                      ->orOn('itemmaster.ItemCode', '=', 'sales_transaction_items.item_code');
                })
                ->on('itemmaster.company_code', '=', 'sales_transaction_items.company_code');
            })
            ->whereBetween('sales_transactions.transaction_date', [$today, $endOfDay])
            ->where('sales_transactions.status', '!=', 'cancelled')
            ->when($sectionCode && $sectionCode !== 'MAIN', function($q) use ($sectionCode) {
                $q->where('sales_transactions.section_code', $sectionCode);
            })
            ->select(
                'sales_transaction_items.item_code',
                DB::raw("COALESCE(NULLIF(itemmaster.ItmNm, ''), sales_transaction_items.item_code) as item_name"),
                DB::raw('SUM(sales_transaction_items.quantity) as total_qty'),
                DB::raw('SUM(sales_transaction_items.line_total) as total_amount')
            )
            ->groupBy('sales_transaction_items.item_code', 'itemmaster.ItmNm')
            ->orderByDesc('total_qty')
            ->take(5)
            ->get();

        // 5. Recent Transactions
        $recentTransactions = SalesTransaction::with('cashier')
            ->where('status', '!=', 'cancelled')
            ->when($sectionCode && $sectionCode !== 'MAIN', function($q) use ($sectionCode) {
                $q->where('section_code', $sectionCode);
            })
            // limit for cashier users
            ->when($user->role && $user->role->level === 'cashier', fn($q) => $q->where('cashier_id', $user->id))
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function($sale) {
                return [
                    'id' => $sale->id,
                    'invoice_no' => $sale->invoice_no,
                    'customer_name' => $sale->customer_name ?? 'Walk-in',
                    'amount' => $sale->total_amount,
                    'balance' => $sale->balance_amount,
                    'time' => $sale->created_at->format('H:i'),
                    'status' => $sale->status,
                ];
            });

        return [
            'todays_sales' => [
                'total' => $totalSales,
                'count' => $transactionCount,
                'returns' => $totalReturns,
                'net_total' => $totalSales - $totalReturns,
                'split' => $paymentSplit
            ],
            'ready_for_collection' => $readyForCollection,
            'low_stock_items' => $lowStockItems,
            'top_selling_items' => $topSellingItems,
            'recent_transactions' => $recentTransactions,
        ];
    }
    private function getStockManagerStats()
    {
        $user = Auth::user();
        $companyCode = $user->company_code;

        $itemsQuery = ItemMaster::query();
        $transfersQuery = \App\Models\StockTransfer::query();
        $wastageQuery = \App\Models\Wastage::query();

        if ($user->role_id !== 1) {
            $itemsQuery->where('company_code', $companyCode);
            $transfersQuery->where('company_code', $companyCode);
            // $wastageQuery->whereHas('section', function($q) use ($companyCode) { $q->where('company_code', $companyCode); }); // Wastage doesn't have company_code directly, but we'll skip for simplicity or assume it's scoped if needed.
        } else {
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $itemsQuery->where('company_code', $selectedCompany);
                $transfersQuery->where('company_code', $selectedCompany);
            } else {
                $itemsQuery->whereRaw('1 = 0');
                $transfersQuery->whereRaw('1 = 0');
            }
        }

        // Total Items
        $totalItemsCount = (clone $itemsQuery)->count();

        // Low Stock Query with subquery
        $lowStockQuery = (clone $itemsQuery)
            ->select('itemmaster.*')
            ->selectRaw('(select coalesce(sum(`stock_in_hand`.`Qty`), 0) from `stock_in_hand` where `itemmaster`.`ItmKy` = `stock_in_hand`.`ItemKy`) as current_stock')
            ->where('Status', 'A')
            ->where('ReOrdlLvl', '>', 0)
            ->whereRaw('(select coalesce(sum(`stock_in_hand`.`Qty`), 0) from `stock_in_hand` where `itemmaster`.`ItmKy` = `stock_in_hand`.`ItemKy`) <= `ReOrdlLvl`');

        // Low Stock Alerts Count
        $lowStockCount = (clone $lowStockQuery)->count();
            
        $criticalReorderList = (clone $lowStockQuery)
            ->orderByRaw('(select coalesce(sum(`stock_in_hand`.`Qty`), 0) from `stock_in_hand` where `itemmaster`.`ItmKy` = `stock_in_hand`.`ItemKy`) - `ReOrdlLvl` ASC') // most critical first
            ->take(10)
            ->get()
            ->map(function($item) {
                return [
                    'item_code' => $item->ItemCode,
                    'item_name' => $item->ItmNm,
                    'current_stock' => $item->current_stock,
                    'reorder_level' => $item->ReOrdlLvl,
                ];
            });

        // Today's Transfers (since transfers don't have a pending status in this system)
        $todaysTransfersCount = (clone $transfersQuery)
            ->whereDate('created_at', now()->toDateString())
            ->count();
            
        $recentTransfers = (clone $transfersQuery)
            ->with(['fromSection', 'toSection'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function($t) {
                return [
                    'id' => $t->id,
                    'transfer_no' => $t->transfer_number ?? 'N/A',
                    'date' => $t->created_at->format('Y-m-d H:i'),
                    'status' => 'Completed',
                ];
            });

        // Monthly Wastage (current month)
        $monthlyWastageAmount = (clone $wastageQuery)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum(DB::raw('quantity * cost_price'));

        return [
            'kpis' => [
                'total_items' => $totalItemsCount,
                'low_stock_alerts' => $lowStockCount,
                'todays_transfers' => $todaysTransfersCount,
                'monthly_wastage' => $monthlyWastageAmount ?: 0,
            ],
            'critical_reorder_list' => $criticalReorderList,
            'recent_transfers' => $recentTransfers,
        ];
    }

    private function getTechnicianStats()
    {
        $user = Auth::user();
        $today = now()->startOfDay();
        $endOfDay = now()->endOfDay();

        // 1. My Active Jobs (Assigned to me, not completed/delivered/cancelled)
        $myActiveJobsQuery = ServiceJob::with('customer')
            ->where('assigned_technician_id', $user->id)
            ->whereNotIn('status', ['completed', 'delivered', 'cancelled']);
            
        if ($user->role_id !== 1) {
            $myActiveJobsQuery->where('company_code', $user->company_code);
        } else {
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $myActiveJobsQuery->where('company_code', $selectedCompany);
            } else {
                $myActiveJobsQuery->whereRaw('1 = 0');
            }
        }
            
        $activeJobsCount = (clone $myActiveJobsQuery)->count();
        $myActiveJobs = (clone $myActiveJobsQuery)->latest()->take(5)->get()->map(function($job) {
             return [
                'id' => $job->id,
                'job_number' => $job->job_number,
                'customer_name' => $job->customer_name,
                'device' => $job->device_name . ' ' . $job->device_model,
                'status' => $job->status,
                'created_at' => $job->created_at->format('Y-m-d'),
            ];
        });

        // 2. Pending Jobs (Unassigned, available to claim)
        $pendingJobsQuery = ServiceJob::with('customer')
            ->where('status', 'pending')
            ->whereNull('assigned_technician_id');

        if ($user->role_id !== 1) {
            $pendingJobsQuery->where('company_code', $user->company_code);
        } else {
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $pendingJobsQuery->where('company_code', $selectedCompany);
            } else {
                $pendingJobsQuery->whereRaw('1 = 0');
            }
        }

        $pendingJobsCount = (clone $pendingJobsQuery)->count();
        $availableJobs = (clone $pendingJobsQuery)->latest()->take(5)->get()->map(function($job) {
             return [
                'id' => $job->id,
                'job_number' => $job->job_number,
                'device' => $job->device_name . ' ' . $job->device_model,
                'issue' => \Illuminate\Support\Str::limit($job->problem_description, 50),
                'created_at' => $job->created_at->format('Y-m-d'),
            ];
        });

        // 3. Completed Today
        $completedTodayQuery = ServiceJob::where('assigned_technician_id', $user->id)
            ->whereIn('status', ['completed', 'delivered'])
            ->whereBetween('updated_at', [$today, $endOfDay]);

        if ($user->role_id !== 1) {
            $completedTodayQuery->where('company_code', $user->company_code);
        } else {
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $completedTodayQuery->where('company_code', $selectedCompany);
            } else {
                $completedTodayQuery->whereRaw('1 = 0');
            }
        }

        $completedTodayCount = $completedTodayQuery->count();

        return [
            'active_jobs_count' => $activeJobsCount,
            'pending_jobs_count' => $pendingJobsCount,
            'completed_today_count' => $completedTodayCount,
            'my_active_jobs' => $myActiveJobs,
            'available_jobs' => $availableJobs,
            'available_jobs' => $availableJobs,
        ];
    }

    /**
     * Render a dedicated dashboard for Sales Representatives
     */
    public function salesRep()
    {
        $user = Auth::user();

        if (! $user->role || !in_array($user->role->level, ['sales_rep', 'admin', 'company_admin'])) {
            if (!$user->isSuperAdmin()) {
                abort(403);
            }
        }

        $stats = $this->getSalesRepStats();

        return Inertia::render('Dashboard/sales-rep', [
            'stats' => $stats,
            'role' => 'sales_rep',
        ]);
    }

    /**
     * Gather sales-rep specific stats (deliveries, collections, vehicle)
     */
    private function getSalesRepStats()
    {
        $user = Auth::user();
        $today = now()->toDateString();

        $baseQuery = Delivery::where('assigned_user_id', $user->id)->where('company_code', $user->company_code);

        $totalAssigned = (clone $baseQuery)->count();
        $todayAssigned = (clone $baseQuery)->whereDate('delivery_date', $today)->count();
        $assignedStatus = (clone $baseQuery)->where('status', 'assigned')->count();
        $inTransit = (clone $baseQuery)->where('status', 'delivering')->count();
        $delivered = (clone $baseQuery)->where('status', 'delivered')->count();

        // Load deliveries with aggregated payments for accurate outstanding calculation
        $deliveries = (clone $baseQuery)->with('items')->withSum('payments', 'amount')->orderBy('delivery_date')->get();

        $outstandingTotal = $deliveries->sum(function ($d) {
            return (float) $d->outstanding_balance;
        });

        // Today's collections recorded by this rep (excluding credit notes, which are not physical collections)
        $todaysCollections = DeliveryPayment::where('recorded_by', $user->id)
            ->whereDate('payment_date', $today)
            ->where('method', '!=', 'credit_note')
            ->sum('amount');

        // Today's cash in hand (net cash collected)
        $todaysCash = DeliveryPayment::where('recorded_by', $user->id)
            ->whereDate('payment_date', $today)
            ->where('method', 'cash')
            ->sum('amount');

        // Today's shop returns recorded by this rep
        $todaysReturns = \App\Models\ShopReturnItem::whereHas('shopReturn', function($q) use ($user, $today) {
            $q->where('recorded_by', $user->id)->whereDate('return_date', $today);
        })->get()->sum(fn($i) => (float)$i->quantity * (float)$i->unit_price);

        // Recent deliveries (next / recent 6)
        $recentDeliveries = $deliveries->take(6)->map(function ($d) {
            $total = $d->items->sum(fn($i) => (float) ($i->total_amount ?? 0));
            $paid  = (float) ($d->payments_sum_amount ?? 0);

            return [
                'id' => $d->id,
                'delivery_number' => $d->delivery_number,
                'customer_name' => $d->customer_name,
                'delivery_date' => $d->delivery_date,
                'status' => $d->status,
                'total_amount' => (float) $d->total_amount,
                'paid_amount' => (float) $d->paid_amount,
                'outstanding' => (float) $d->outstanding_balance,
                'route_name' => $d->deliveryRoute?->name ?? null,
            ];
        })->values();

        // Vehicle (if assigned)
        $vehicle = Vehicle::where('assigned_user_id', $user->id)->where('company_code', $user->company_code)->first();
        $vehicleStock = null;
        if ($vehicle) {
            $vehicleStock = VehicleStock::where('vehicle_id', $vehicle->id)
                ->take(6)
                ->get()
                ->map(fn($vs) => [
                    'item_ky' => $vs->item_ky,
                    'batch_no' => $vs->batch_no,
                    'quantity' => $vs->quantity,
                ]);
        }

        return [
            'assigned_count' => $totalAssigned,
            'today_assigned_count' => $todayAssigned,
            'assigned_status_count' => $assignedStatus,
            'in_transit_count' => $inTransit,
            'delivered_count' => $delivered,
            'outstanding_total' => (float) $outstandingTotal,
            'todays_collections' => (float) $todaysCollections,
            'todays_cash' => (float) $todaysCash,
            'todays_returns' => (float) $todaysReturns,
            'recent_deliveries' => $recentDeliveries,
            'vehicle' => $vehicle ? [
                'id' => $vehicle->id,
                'name' => $vehicle->name,
                'registration_no' => $vehicle->registration_no,
                'stock' => $vehicleStock,
            ] : null,
        ];
    }
}

