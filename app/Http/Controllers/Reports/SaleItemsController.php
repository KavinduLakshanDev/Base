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

class SaleItemsController extends Controller
{
    public function index(Request $request)
    {
        set_time_limit(120);
        $company = $this->getCompany();
        
        $fromDate = $request->from_date ? Carbon::parse($request->from_date)->startOfDay() : Carbon::now()->subDays(7)->startOfDay();
        $toDate = $request->to_date ? Carbon::parse($request->to_date)->endOfDay() : Carbon::now()->endOfDay();

        $query = SalesTransactionItem::select([
            'sales_transaction_items.id',
            'sales_transaction_items.item_code',
            DB::raw("COALESCE(NULLIF(im1.ItmNm, ''), NULLIF(im2.ItmNm, ''), sales_transaction_items.item_code) as item_name"),
            'sales_transaction_items.quantity',
            'sales_transaction_items.unit_price',
            'sales_transaction_items.line_total',
            'sales_transaction_items.serial_number',
            'sales_transaction_items.section_code',
            DB::raw("COALESCE(b1.name, b2.name) as brand"),
            DB::raw("COALESCE(m1.name, m2.name) as model"),
            DB::raw("COALESCE(im1.item_type, im2.item_type) as item_type"),
            'sales_transactions.invoice_no',
            'sales_transactions.transaction_date',
            'sales_transactions.customer_name',
            'sections.name as section_name',
        ])
        ->join('sales_transactions', 'sales_transaction_items.sales_transaction_id', '=', 'sales_transactions.id')
        ->leftJoin('sections', 'sales_transaction_items.section_code', '=', 'sections.section_code')
        ->leftJoin('itemmaster as im1', 'sales_transaction_items.product_id', '=', 'im1.ItmKy')
        ->leftJoin('itemmaster as im2', 'sales_transaction_items.item_code', '=', 'im2.ItemCode')
        ->leftJoin('brands as b1', 'im1.brand_id', '=', 'b1.id')
        ->leftJoin('brands as b2', 'im2.brand_id', '=', 'b2.id')
        ->leftJoin('models as m1', 'im1.models_id', '=', 'm1.id')
        ->leftJoin('models as m2', 'im2.models_id', '=', 'm2.id')
        ->when($company->company_code ?? null, function ($q, $companyCode) {
            return $q->where('sales_transaction_items.company_code', $companyCode);
        })
        ->when($request->item_type && $request->item_type !== 'all', function ($q) use ($request) {
            return $q->where(function($query) use ($request) {
                $query->where('im1.item_type', $request->item_type)
                      ->orWhere('im2.item_type', $request->item_type);
            });
        })
        ->when($request->cashier_id && $request->cashier_id !== 'all', function ($q) use ($request) {
            return $q->where('sales_transactions.cashier_id', $request->cashier_id);
        })
        ->when($request->invoice_no, function ($q) use ($request) {
            return $q->where('sales_transactions.invoice_no', 'like', "%{$request->invoice_no}%");
        })
        ->when($request->serial_number, function ($q) use ($request) {
            return $q->where('sales_transaction_items.serial_number', 'like', "%{$request->serial_number}%");
        })
        ->whereBetween('sales_transactions.transaction_date', [$fromDate->toDateTimeString(), $toDate->toDateTimeString()]);
        
        if ($request->boolean('include_service_jobs', false)) {
            $serviceJobsQuery = DB::table('service_job_items')
                ->select([
                    'service_job_items.id',
                    'service_job_items.item_code',
                    'service_job_items.item_name',
                    'service_job_items.quantity',
                    'service_job_items.unit_price',
                    'service_job_items.total_price as line_total',
                    'service_job_items.serial_number',
                    'service_jobs.section_code',
                    'service_job_items.brand',
                    'service_job_items.model',
                    'service_job_items.item_type',
                    'service_jobs.invoice_number as invoice_no',
                    'service_jobs.invoice_date as transaction_date',
                    'service_jobs.customer_name',
                    'sections.name as section_name',
                ])
                ->join('service_jobs', 'service_job_items.service_job_id', '=', 'service_jobs.id')
                ->leftJoin('sections', 'service_jobs.section_code', '=', 'sections.section_code')
                ->whereNotNull('service_jobs.invoice_number')
                ->whereIn('service_jobs.status', ['delivered', 'completed'])
                ->when($company->company_code ?? null, function ($q, $companyCode) {
                    return $q->where('service_jobs.company_code', $companyCode);
                })
                ->when($request->item_type && $request->item_type !== 'all', function ($q) use ($request) {
                    return $q->where('service_job_items.item_type', $request->item_type);
                })
                ->when($request->cashier_id && $request->cashier_id !== 'all', function ($q) use ($request) {
                    return $q->where('service_jobs.created_by', $request->cashier_id);
                })
                ->when($request->invoice_no, function ($q) use ($request) {
                    return $q->where('service_jobs.invoice_number', 'like', "%{$request->invoice_no}%");
                })
                ->when($request->serial_number, function ($q) use ($request) {
                    return $q->where('service_job_items.serial_number', 'like', "%{$request->serial_number}%");
                })
                ->whereBetween('service_jobs.invoice_date', [$fromDate->toDateTimeString(), $toDate->toDateTimeString()]);
                
            $query = $query->unionAll($serviceJobsQuery);
            $finalQuery = DB::table(DB::raw("({$query->toSql()}) as combined"))
                ->mergeBindings($query->getQuery())
                ->orderBy('transaction_date', 'desc');
            $records = $finalQuery->paginate(25)->withQueryString();
        } else {
            $query->orderBy('sales_transactions.transaction_date', 'desc');
            $records = $query->paginate(25)->withQueryString();
        }

        $cashiers = User::select('id', 'first_name', 'last_name')
            ->when($company->company_code ?? null, function ($q, $companyCode) {
                return $q->where('company_code', $companyCode);
            })
            ->whereHas('role', function ($q) {
                $q->where('level', 'cashier');
            })
            ->orderBy('first_name')
            ->get();

        return Inertia::render('Reports/SaleItems', [
            'records' => $records,
            'cashiers' => $cashiers,
            'company' => $company,
            'filters' => [
                'item_type' => $request->item_type ?? 'all',
                'cashier_id' => $request->cashier_id ?? 'all',
                'invoice_no' => $request->invoice_no ?? '',
                'from_date' => $fromDate->toDateString(),
                'to_date' => $toDate->toDateString(),
                'serial_number' => $request->serial_number ?? '',
                'include_service_jobs' => $request->boolean('include_service_jobs', false),
            ],
        ]);
    }

    public function exportCsv(Request $request)
    {
        $company = $this->getCompany();
        
        $fromDate = $request->from_date ? Carbon::parse($request->from_date)->startOfDay() : Carbon::now()->subDays(7)->startOfDay();
        $toDate = $request->to_date ? Carbon::parse($request->to_date)->endOfDay() : Carbon::now()->endOfDay();

        $query = SalesTransactionItem::select([
            'sales_transaction_items.id',
            'sales_transaction_items.item_code',
            DB::raw("COALESCE(NULLIF(im1.ItmNm, ''), NULLIF(im2.ItmNm, ''), sales_transaction_items.item_code) as item_name"),
            'sales_transaction_items.quantity',
            'sales_transaction_items.unit_price',
            'sales_transaction_items.line_total',
            'sales_transaction_items.serial_number',
            'sales_transaction_items.section_code',
            DB::raw("COALESCE(b1.name, b2.name) as brand"),
            DB::raw("COALESCE(m1.name, m2.name) as model"),
            DB::raw("COALESCE(im1.item_type, im2.item_type) as item_type"),
            'sales_transactions.invoice_no',
            'sales_transactions.transaction_date',
            'sales_transactions.customer_name',
            'sections.name as section_name',
        ])
        ->join('sales_transactions', 'sales_transaction_items.sales_transaction_id', '=', 'sales_transactions.id')
        ->leftJoin('sections', 'sales_transaction_items.section_code', '=', 'sections.section_code')
        ->leftJoin('itemmaster as im1', 'sales_transaction_items.product_id', '=', 'im1.ItmKy')
        ->leftJoin('itemmaster as im2', 'sales_transaction_items.item_code', '=', 'im2.ItemCode')
        ->leftJoin('brands as b1', 'im1.brand_id', '=', 'b1.id')
        ->leftJoin('brands as b2', 'im2.brand_id', '=', 'b2.id')
        ->leftJoin('models as m1', 'im1.models_id', '=', 'm1.id')
        ->leftJoin('models as m2', 'im2.models_id', '=', 'm2.id')
        ->when($company->company_code ?? null, function ($q, $companyCode) {
            return $q->where('sales_transaction_items.company_code', $companyCode);
        })
        ->when($request->item_type && $request->item_type !== 'all', function ($q) use ($request) {
            return $q->where(function($query) use ($request) {
                $query->where('im1.item_type', $request->item_type)
                      ->orWhere('im2.item_type', $request->item_type);
            });
        })
        ->when($request->cashier_id && $request->cashier_id !== 'all', function ($q) use ($request) {
            return $q->where('sales_transactions.cashier_id', $request->cashier_id);
        })
        ->when($request->invoice_no, function ($q) use ($request) {
            return $q->where('sales_transactions.invoice_no', 'like', "%{$request->invoice_no}%");
        })
        ->when($request->serial_number, function ($q) use ($request) {
            return $q->where('sales_transaction_items.serial_number', 'like', "%{$request->serial_number}%");
        })
        ->whereBetween('sales_transactions.transaction_date', [$fromDate->toDateTimeString(), $toDate->toDateTimeString()]);
        
        if ($request->boolean('include_service_jobs', false)) {
            $serviceJobsQuery = DB::table('service_job_items')
                ->select([
                    'service_job_items.id',
                    'service_job_items.item_code',
                    'service_job_items.item_name',
                    'service_job_items.quantity',
                    'service_job_items.unit_price',
                    'service_job_items.total_price as line_total',
                    'service_job_items.serial_number',
                    'service_jobs.section_code',
                    'service_job_items.brand',
                    'service_job_items.model',
                    'service_job_items.item_type',
                    'service_jobs.invoice_number as invoice_no',
                    'service_jobs.invoice_date as transaction_date',
                    'service_jobs.customer_name',
                    'sections.name as section_name',
                ])
                ->join('service_jobs', 'service_job_items.service_job_id', '=', 'service_jobs.id')
                ->leftJoin('sections', 'service_jobs.section_code', '=', 'sections.section_code')
                ->whereNotNull('service_jobs.invoice_number')
                ->whereIn('service_jobs.status', ['delivered', 'completed'])
                ->when($company->company_code ?? null, function ($q, $companyCode) {
                    return $q->where('service_jobs.company_code', $companyCode);
                })
                ->when($request->item_type && $request->item_type !== 'all', function ($q) use ($request) {
                    return $q->where('service_job_items.item_type', $request->item_type);
                })
                ->when($request->cashier_id && $request->cashier_id !== 'all', function ($q) use ($request) {
                    return $q->where('service_jobs.created_by', $request->cashier_id);
                })
                ->when($request->invoice_no, function ($q) use ($request) {
                    return $q->where('service_jobs.invoice_number', 'like', "%{$request->invoice_no}%");
                })
                ->when($request->serial_number, function ($q) use ($request) {
                    return $q->where('service_job_items.serial_number', 'like', "%{$request->serial_number}%");
                })
                ->whereBetween('service_jobs.invoice_date', [$fromDate->toDateTimeString(), $toDate->toDateTimeString()]);
                
            $query = $query->unionAll($serviceJobsQuery);
            $finalQuery = DB::table(DB::raw("({$query->toSql()}) as combined"))
                ->mergeBindings($query->getQuery())
                ->orderBy('transaction_date', 'desc');
            $records = $finalQuery->get();
        } else {
            $query->orderBy('sales_transactions.transaction_date', 'desc');
            $records = $query->get();
        }

        $filename = "Sale_Items_Report_" . now()->format('Ymd_His') . ".csv";
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];
        
        $showPrinterColumns = $request->item_type !== 'product';
        
        $columns = ['Date', 'Invoice', 'Customer', 'Item Code', 'Item Name'];
        if ($showPrinterColumns) {
            $columns = array_merge($columns, ['Serial Number', 'Brand', 'Model']);
        }
        $columns = array_merge($columns, ['Qty', 'Unit Price', 'Total Price']);

        $callback = function() use($records, $columns, $showPrinterColumns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($records as $row) {
                $date = $row->transaction_date ? Carbon::parse($row->transaction_date)->format('d/m/Y') : 'Unknown Date';
                
                $rowData = [
                    $date,
                    $row->invoice_no,
                    $row->customer_name,
                    $row->item_code,
                    $row->item_name,
                ];
                
                if ($showPrinterColumns) {
                    $rowData[] = $row->serial_number;
                    $rowData[] = $row->brand;
                    $rowData[] = $row->model;
                }
                
                $rowData[] = number_format((float)$row->quantity, 2, '.', '');
                $rowData[] = number_format((float)$row->unit_price, 2, '.', '');
                $rowData[] = number_format((float)$row->line_total, 2, '.', '');
                
                fputcsv($file, $rowData);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
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
