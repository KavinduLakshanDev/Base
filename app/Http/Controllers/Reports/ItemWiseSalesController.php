<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\SalesTransactionItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\ItemMaster;

class ItemWiseSalesController extends Controller
{
    public function index(Request $request)
    {
        $company = $this->getCompany();
        
        $fromDate = $request->from_date ? Carbon::parse($request->from_date) : Carbon::now()->subDays(7)->startOfDay();
        $toDate = $request->to_date ? Carbon::parse($request->to_date) : Carbon::now();

        $records = SalesTransactionItem::select([
            'sales_transaction_items.item_code',
            DB::raw("MAX(COALESCE(NULLIF(itemmaster.ItmNm, ''), sales_transaction_items.item_code)) as item_name"),
            DB::raw("SUM(sales_transaction_items.quantity) as total_quantity"),
            DB::raw("SUM(sales_transaction_items.line_total) as total_sales"),
        ])
        ->join('sales_transactions', 'sales_transaction_items.sales_transaction_id', '=', 'sales_transactions.id')
        ->leftJoin('itemmaster', function($join) {
            $join->on(function($q) {
                $q->on('itemmaster.ItmKy', '=', 'sales_transaction_items.product_id')
                  ->orOn('itemmaster.ItemCode', '=', 'sales_transaction_items.item_code');
            })
            ->on('itemmaster.company_code', '=', 'sales_transaction_items.company_code');
        })
        ->when($company->company_code ?? null, function ($q, $companyCode) {
            return $q->where('sales_transaction_items.company_code', $companyCode);
        })
        ->when($request->item_type && $request->item_type !== 'all', function ($q) use ($request) {
            return $q->where('itemmaster.item_type', $request->item_type);
        })
        ->when($request->item_name, function ($q, $itemName) {
            return $q->where(function ($sub) use ($itemName) {
                $sub->where('itemmaster.ItmNm', 'like', "%{$itemName}%")
                    ->orWhere('sales_transaction_items.item_code', 'like', "%{$itemName}%");
            });
        })
        ->when($request->cashier_id && $request->cashier_id !== 'all', function ($q) use ($request) {
            return $q->where('sales_transactions.cashier_id', $request->cashier_id);
        })
        ->whereBetween('sales_transactions.transaction_date', [$fromDate->startOfDay(), $toDate->endOfDay()])
        ->groupBy('sales_transaction_items.item_code')
        ->orderBy('total_quantity', 'desc')
        ->get();
        
        $cashiers = User::select('id', 'first_name', 'last_name')
            ->when($company->company_code ?? null, function ($q, $companyCode) {
                return $q->where('company_code', $companyCode);
            })
            ->whereHas('role', function ($q) {
                $q->where('level', 'cashier');
            })
            ->orderBy('first_name')
            ->get();
        $items = ItemMaster::where('company_code', $company->company_code ?? 'C01')
            ->select('ItemCode', 'ItmNm')
            ->get();

        return Inertia::render('Reports/ItemWiseSales', [
            'records' => $records,
            'cashiers' => $cashiers,
            'items' => $items,
            'company' => $company,
            'filters' => [
                'item_type' => $request->item_type ?? 'all',
                'item_name' => $request->item_name ?? '',
                'cashier_id' => $request->cashier_id ?? 'all',
                'from_date' => $fromDate->toDateString(),
                'to_date' => $toDate->toDateString(),
            ],
        ]);
    }

    private function getCompany()
    {
        if (auth('company')->check()) {
            return auth('company')->user();
        }
        $user = auth('web')->user();
        return $user ? $user->company : Company::first();
    }
}
