<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Models\SalesTransaction;
use App\Models\Purchase;
use App\Models\Customer;
use App\Models\ItemMaster;
use App\Models\StockInHand;
use App\Models\ServiceJob;
use App\Models\Delivery;
use App\Models\CustomerPayment;
use App\Models\SupplierPayment;
use App\Models\StockTransfer;
use App\Models\Quotation;
use App\Models\AccMas;
use App\Models\Wastage;
use App\Models\Section;
use Carbon\Carbon;

class CompanyDashboardController extends Controller
{
    public function index()
    {
        $companyCode = auth()->user()->company_code;
        $sectionCodes = Section::where('company_code', $companyCode)->pluck('section_code');
        $sectionIds   = Section::where('company_code', $companyCode)->pluck('id');

        $stats     = $this->getCompanyStats($companyCode, $sectionCodes, $sectionIds);
        $chartData = $this->getChartData($companyCode, $sectionCodes);

        return Inertia::render('company-dashboard', [
            'stats' => $stats,
            'chartData' => $chartData,
        ]);
    }

    private function getCompanyStats(string $companyCode, $sectionCodes, $sectionIds)
    {
        $today = Carbon::today();
        $thisMonth = Carbon::now()->month;
        $thisYear = Carbon::now()->year;

        // ============ Sales Statistics ============
        $totalSales = SalesTransaction::whereIn('section_code', $sectionCodes)
            ->whereMonth('transaction_date', $thisMonth)
            ->whereYear('transaction_date', $thisYear)
            ->sum('total_amount');

        $todaySales = SalesTransaction::whereIn('section_code', $sectionCodes)
            ->whereDate('transaction_date', $today)
            ->sum('total_amount');

        $totalSalesCount = SalesTransaction::whereIn('section_code', $sectionCodes)
            ->whereMonth('transaction_date', $thisMonth)
            ->whereYear('transaction_date', $thisYear)
            ->count();

        // ============ Purchase Statistics ============
        $totalPurchases = Purchase::where('company_code', $companyCode)
            ->whereMonth('GRNDate', $thisMonth)
            ->whereYear('GRNDate', $thisYear)
            ->sum('TotalVal');

        $totalPurchaseCount = Purchase::where('company_code', $companyCode)
            ->whereMonth('GRNDate', $thisMonth)
            ->whereYear('GRNDate', $thisYear)
            ->count();

        // ============ Service Job Statistics ============
        $totalServiceJobs = ServiceJob::where('company_code', $companyCode)
            ->whereMonth('received_date', $thisMonth)
            ->whereYear('received_date', $thisYear)
            ->count();

        $pendingJobs = ServiceJob::where('company_code', $companyCode)
            ->whereIn('status', ['pending', 'in_progress', 'awaiting_parts', 'ready_for_testing'])
            ->count();

        $completedJobsThisMonth = ServiceJob::where('company_code', $companyCode)
            ->where('status', 'completed')
            ->whereMonth('updated_at', $thisMonth)
            ->whereYear('updated_at', $thisYear)
            ->count();

        $totalServiceRevenue = ServiceJob::where('company_code', $companyCode)
            ->whereMonth('invoice_date', $thisMonth)
            ->whereYear('invoice_date', $thisYear)
            ->sum('total_amount');

        // ============ Customer & Supplier Statistics ============
        $totalCustomers = AccMas::where('company_code', $companyCode)
            ->where('AccTyp', 'CUSTOMER')->count();
        $totalSuppliers = AccMas::where('company_code', $companyCode)
            ->where('AccTyp', 'SUPPLIER')->count();
        $newCustomersThisMonth = AccMas::where('company_code', $companyCode)
            ->where('AccTyp', 'CUSTOMER')
            ->whereMonth('created_at', $thisMonth)
            ->whereYear('created_at', $thisYear)
            ->count();

        // ============ Stock Statistics ============
        $totalProducts = ItemMaster::where('company_code', $companyCode)->where('Status', 'A')->count();

        // Aggregate stock per item across all company sections, then compare against reorder level
        $stockPerItem = DB::table('stock_in_hand')
            ->where('stock_in_hand.company_code', $companyCode)
            ->select('ItemKy', DB::raw('SUM(Qty) as total_qty'))
            ->groupBy('ItemKy');

        $lowStockItems = DB::table('itemmaster')
            ->where('itemmaster.company_code', $companyCode)
            ->where('itemmaster.Status', 'A')
            ->where('itemmaster.ReOrdlLvl', '>', 0)
            ->joinSub($stockPerItem, 'stock', 'itemmaster.ItmKy', '=', 'stock.ItemKy')
            ->whereColumn('stock.total_qty', '<', 'itemmaster.ReOrdlLvl')
            ->where('stock.total_qty', '>', 0)
            ->count();

        $outOfStockItems = DB::table('itemmaster')
            ->where('itemmaster.company_code', $companyCode)
            ->where('itemmaster.Status', 'A')
            ->joinSub($stockPerItem, 'stock', 'itemmaster.ItmKy', '=', 'stock.ItemKy')
            ->where('stock.total_qty', '<=', 0)
            ->count();

        $totalStockValue = DB::table('stock_in_hand')
            ->where('stock_in_hand.company_code', $companyCode)
            ->join('itemmaster', 'stock_in_hand.ItemKy', '=', 'itemmaster.ItmKy')
            ->where('stock_in_hand.Qty', '>', 0)
            ->sum(DB::raw('stock_in_hand.Qty * itemmaster.SlsPri'));

        $wastageCount = Wastage::whereIn('section_id', $sectionIds)
            ->whereMonth('created_at', $thisMonth)
            ->whereYear('created_at', $thisYear)
            ->count();

        // Calculate wastage value if cost_price column exists, otherwise default to 0
        $wastageValue = 0;
        try {
            $wastageValue = Wastage::whereIn('section_id', $sectionIds)
                ->whereMonth('created_at', $thisMonth)
                ->whereYear('created_at', $thisYear)
                ->sum(DB::raw('COALESCE(quantity * cost_price, 0)'));
        } catch (\Exception $e) {
            // Column doesn't exist, keep as 0
            $wastageValue = 0;
        }

        // ============ Delivery Statistics ============
        $totalDeliveries = 0;
        $pendingDeliveries = 0;
        $completedDeliveries = 0;
        
        if (class_exists('\App\Models\Delivery')) {
            $totalDeliveries = Delivery::where('company_code', $companyCode)
                ->whereMonth('created_at', $thisMonth)
                ->whereYear('created_at', $thisYear)
                ->count();
            
            $pendingDeliveries = Delivery::where('company_code', $companyCode)
                ->whereIn('status', ['pending', 'in_transit'])
                ->count();
            
            $completedDeliveries = Delivery::where('company_code', $companyCode)
                ->where('status', 'delivered')
                ->whereMonth('updated_at', $thisMonth)
                ->whereYear('updated_at', $thisYear)
                ->count();
        }

        // ============ Payment Statistics ============
        $customerPaymentsThisMonth = CustomerPayment::whereMonth('date', $thisMonth)
            ->whereYear('date', $thisYear)
            ->where(function ($q) use ($sectionCodes, $companyCode) {
                $q->whereHas('salesTransaction', fn ($sq) => $sq->whereIn('section_code', $sectionCodes))
                  ->orWhereHas('serviceJob', fn ($sq) => $sq->where('company_code', $companyCode));
            })
            ->sum('amount');

        $supplierPaymentsThisMonth = SupplierPayment::where('company_code', $companyCode)
            ->whereMonth('payment_date', $thisMonth)
            ->whereYear('payment_date', $thisYear)
            ->sum('paid_amount');

        // ============ Stock Transfer Statistics ============
        $stockTransfersThisMonth = StockTransfer::where('company_code', $companyCode)
            ->whereMonth('transfer_date', $thisMonth)
            ->whereYear('transfer_date', $thisYear)
            ->count();

        // ============ Quotation Statistics ============
        $totalQuotations = Quotation::whereHas('serviceJob', fn ($q) => $q->where('company_code', $companyCode))
            ->whereMonth('created_at', $thisMonth)
            ->whereYear('created_at', $thisYear)
            ->count();

        $quotationValue = Quotation::whereHas('serviceJob', fn ($q) => $q->where('company_code', $companyCode))
            ->whereMonth('created_at', $thisMonth)
            ->whereYear('created_at', $thisYear)
            ->sum('total_amount');

        // ============ Recent Activities ============
        $recentSales = SalesTransaction::with('customer')
            ->whereIn('section_code', $sectionCodes)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($sale) {
                return [
                    'id' => $sale->id,
                    'customer_name' => $sale->customer?->AccNm ?? 'Walk-in Customer',
                    'total_amount' => $sale->total_amount,
                    'created_at' => $sale->created_at->format('M d, Y H:i'),
                ];
            });

        $recentServiceJobs = ServiceJob::where('company_code', $companyCode)
            ->orderBy('received_date', 'desc')
            ->take(5)
            ->get()
            ->map(function ($job) {
                return [
                    'id' => $job->id,
                    'job_number' => $job->job_number,
                    'customer_name' => $job->customer_name,
                    'status' => $job->status,
                    'device' => $job->device_brand . ' ' . $job->device_model,
                    'received_date' => Carbon::parse($job->received_date)->format('M d, Y'),
                ];
            });

        return [
            // Sales
            'total_sales' => $totalSales,
            'today_sales' => $todaySales,
            'total_sales_count' => $totalSalesCount,

            // Purchases
            'total_purchases' => $totalPurchases,
            'total_purchase_count' => $totalPurchaseCount,

            // Service Jobs
            'total_service_jobs' => $totalServiceJobs,
            'pending_jobs' => $pendingJobs,
            'completed_jobs' => $completedJobsThisMonth,
            'service_revenue' => $totalServiceRevenue,

            // Customers & Suppliers
            'total_customers' => $totalCustomers,
            'total_suppliers' => $totalSuppliers,
            'new_customers' => $newCustomersThisMonth,

            // Stock
            'total_products' => $totalProducts,
            'low_stock_items' => $lowStockItems,
            'out_of_stock_items' => $outOfStockItems,
            'total_stock_value' => $totalStockValue,
            'wastage_count' => $wastageCount,
            'wastage_value' => $wastageValue,

            // Deliveries
            'total_deliveries' => $totalDeliveries,
            'pending_deliveries' => $pendingDeliveries,
            'completed_deliveries' => $completedDeliveries,

            // Payments
            'customer_payments' => $customerPaymentsThisMonth,
            'supplier_payments' => $supplierPaymentsThisMonth,

            // Transfers & Quotations
            'stock_transfers' => $stockTransfersThisMonth,
            'total_quotations' => $totalQuotations,
            'quotation_value' => $quotationValue,

            // Recent Activities
            'recent_sales' => $recentSales,
            'recent_service_jobs' => $recentServiceJobs,
        ];
    }

    private function getChartData(string $companyCode, $sectionCodes)
    {
        // Sales vs Purchases data for the last 12 months
        $salesData = [];

        for ($i = 11; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $sales = SalesTransaction::whereIn('section_code', $sectionCodes)
                ->whereMonth('transaction_date', $date->month)
                ->whereYear('transaction_date', $date->year)
                ->sum('total_amount');

            $purchases = Purchase::where('company_code', $companyCode)
                ->whereMonth('GRNDate', $date->month)
                ->whereYear('GRNDate', $date->year)
                ->sum('TotalVal');

            $salesData[] = [
                'month' => $date->format('M Y'),
                'sales' => (float) $sales,
                'purchases' => (float) $purchases,
            ];
        }

        // Service Jobs Status Distribution
        $serviceJobStatus = DB::table('service_jobs')
            ->select('status', DB::raw('COUNT(*) as count'))
            ->where('company_code', $companyCode)
            ->whereIn('status', ['pending', 'in_progress', 'completed', 'cancelled', 'delivered'])
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => ucfirst(str_replace('_', ' ', $item->status)),
                    'value' => (int) $item->count,
                ];
            });

        // Top 5 selling products (scoped to this company's sections)
        $topProducts = DB::table('sales_transaction_items')
            ->join('sales_transactions', 'sales_transactions.id', '=', 'sales_transaction_items.sales_transaction_id')
            ->leftJoin('itemmaster', function ($join) {
                $join->on(function($q) {
                    $q->on('itemmaster.ItmKy', '=', 'sales_transaction_items.product_id')
                      ->orOn('itemmaster.ItemCode', '=', 'sales_transaction_items.item_code');
                })
                ->on('itemmaster.company_code', '=', 'sales_transaction_items.company_code');
            })
            ->whereIn('sales_transactions.section_code', $sectionCodes)
            ->select(
                DB::raw("COALESCE(NULLIF(itemmaster.ItmNm, ''), sales_transaction_items.item_code) as item_name"),
                DB::raw('SUM(sales_transaction_items.quantity) as total_qty'),
                DB::raw('SUM(sales_transaction_items.quantity * sales_transaction_items.unit_price) as total_value')
            )
            ->groupBy('itemmaster.ItmNm', 'sales_transaction_items.item_code')
            ->orderBy('total_value', 'desc')
            ->take(5)
            ->get()
            ->map(function ($product) {
                return [
                    'name' => $product->item_name,
                    'quantity' => (int) $product->total_qty,
                    'value' => (float) $product->total_value,
                ];
            });

        // Revenue breakdown by category
        $revenueBreakdown = [
            [
                'name' => 'Sales',
                'value' => (float) SalesTransaction::whereIn('section_code', $sectionCodes)
                    ->whereMonth('transaction_date', Carbon::now()->month)
                    ->whereYear('transaction_date', Carbon::now()->year)
                    ->sum('total_amount'),
            ],
            [
                'name' => 'Service Jobs',
                'value' => (float) ServiceJob::where('company_code', $companyCode)
                    ->whereMonth('invoice_date', Carbon::now()->month)
                    ->whereYear('invoice_date', Carbon::now()->year)
                    ->sum('total_amount'),
            ],
        ];

        return [
            'sales_purchases_trend' => $salesData,
            'service_job_status' => $serviceJobStatus,
            'top_products' => $topProducts,
            'revenue_breakdown' => $revenueBreakdown,
        ];
    }
}