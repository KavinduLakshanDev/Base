<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\SalesTransactionItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class PrinterSalesController extends Controller
{
    public function index(Request $request)
    {
        $company = $this->getCompany();
        
        $fromDate = $request->from_date ? Carbon::parse($request->from_date) : Carbon::now()->subMonths(3);
        $toDate = $request->to_date ? Carbon::parse($request->to_date) : Carbon::now();

        $records = SalesTransactionItem::select([
            'sales_transaction_items.id',
            'sales_transaction_items.item_code',
            DB::raw("COALESCE(NULLIF(itemmaster.ItmNm, ''), sales_transaction_items.item_code) as item_name"),
            'sales_transaction_items.quantity',
            'sales_transaction_items.unit_price',
            'sales_transaction_items.line_total',
            'sales_transaction_items.serial_number',
            'brands.name as brand',
            'models.name as model',
            'sales_transactions.invoice_no',
            'sales_transactions.transaction_date',
            'sales_transactions.customer_name',
        ])
        ->join('sales_transactions', 'sales_transaction_items.sales_transaction_id', '=', 'sales_transactions.id')
        ->leftJoin('itemmaster', function ($join) {
            $join->on(function($q) {
                $q->on('itemmaster.ItmKy', '=', 'sales_transaction_items.product_id')
                  ->orOn('itemmaster.ItemCode', '=', 'sales_transaction_items.item_code');
            })
            ->on('itemmaster.company_code', '=', 'sales_transaction_items.company_code');
        })
        ->leftJoin('brands', 'itemmaster.brand_id', '=', 'brands.id')
        ->leftJoin('models', 'itemmaster.models_id', '=', 'models.id')
        ->where(function ($q) {
            $q->where('itemmaster.ItmNm', 'like', '%printer%')
              ->orWhere('sales_transaction_items.item_code', 'like', 'PR%')
              ->orWhere('brands.name', 'like', '%printer%');
        })
        ->when($company->company_code ?? null, function ($q, $companyCode) {
            return $q->where('sales_transaction_items.company_code', $companyCode);
        })
        ->whereBetween('sales_transactions.transaction_date', [$fromDate->toDateString(), $toDate->toDateString()])
        ->orderBy('sales_transactions.transaction_date', 'desc')
        ->get();

        return Inertia::render('Reports/PrinterSales', [
            'records' => $records,
            'company' => $company,
            'filters' => [
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
