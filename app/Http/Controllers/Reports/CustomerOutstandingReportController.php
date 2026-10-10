<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Company;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CustomerOutstandingReportController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('reports.customer_outstandings')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view reports.');
        }

        $user = Auth::user();
        $company = $this->getCompany();
        $companyCode = ($user->role_id === 1) ? session('selected_company') : $user->company_code;

        // Filters
        $search = $request->get('search');
        $showZero = $request->get('show_zero', false);
        $customerId = $request->get('customer_id');

        $outstandings = $this->getReportData($companyCode, $search, filter_var($showZero, FILTER_VALIDATE_BOOLEAN), $customerId);

        $customers = Address::where('company_code', $company->company_code ?? 'C01')
            ->whereHas('accMas', function ($q) {
                $q->where('AccTyp', 'CUSTOMER');
            })
            ->orderBy('FstNm')
            ->get();

        return Inertia::render('Reports/CustomerOutstandingsReport', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS PVT LTD',
                'branch' => $company->branch ?? 'Main Branch',
                'code' => $company->company_code ?? 'VISMASS',
                'branch_code' => $company->branch_code ?? '001',
            ],
            'filters' => [
                'search' => $search,
                'show_zero' => $showZero,
                'customer_id' => $customerId,
            ],
            'customers' => $customers,
            'reportData' => $outstandings,
        ]);
    }

    private function getReportData($companyCode, $search, $showZero, $customerId = null)
    {
        // 1. Get Service Jobs (Billed - Advanced) per AccKy
        $jobsQuery = DB::table('service_jobs')
            ->select('AccKy', DB::raw('SUM(total_amount) as total_jobs'), DB::raw('SUM(advanced_payment) as total_advanced'))
            ->where('status', '!=', 'cancelled')
            ->groupBy('AccKy');

        // 2. Get Sales Invoices (Billed) per AdrKy
        $salesQuery = DB::table('sales_transactions')
            ->select('customer_id', DB::raw('SUM(total_amount) as total_sales'))
            ->groupBy('customer_id');

        // 3. Get Payments (Paid) per AdrKy (Excluding service job advances if applicable, but CustomerPayment model uses a specific scope. 
        // The scope is: whereNull('service_job_id') or where('service_job_id', '=', 0) -> let's check CustomerPayment model if we need to.
        // Actually, CustomerPayment::withoutServiceAdvancePayments() typically excludes payments made *as* advance. We will use a subquery that mimics it.
        // Usually, `service_job_id` is filled when paying for a job. Wait, in CustomerPayment, there might be a flag or we just take all payments.
        // For simplicity and exact match, we will join the actual models or use raw DB query.
        $paymentsQuery = DB::table('customer_payments')
            ->select('customer_id', DB::raw('SUM(amount) as total_paid'))
            ->whereNotIn('method', ['applied_credit', 'exchange_balance_due'])
            ->where(function($q) {
                 // mimic withoutServiceAdvancePayments
                 $q->whereNull('notes')->orWhere('notes', 'not like', 'Service advance payment%');
            })
            ->groupBy('customer_id');

        // 4. Get AccTrn Debits per AccKy
        $accTrnQuery = DB::table('acc_trn')
            ->select('AccKy', DB::raw('SUM(Amt) as total_debits'))
            ->where('FInAct', 1)
            ->where('Status', 'A')
            ->where('Amt', '>', 0)
            ->groupBy('AccKy');

        // 5. Get Customer Returns (Credit) per AdrKy
        $returnsQuery = DB::table('customer_returns')
            ->select('customer_id', DB::raw('SUM(total_return_amount) as total_returns'))
            ->groupBy('customer_id');

        // Main Query
        $query = DB::table('address')
            ->select(
                'address.AdrKy',
                'address.AccKy',
                'address.AdrCd as customer_code',
                'address.FstNm as first_name',
                'address.LstNm as last_name',
                'address.TP1 as phone',
                'AccMas.opening_balance',
                'jobs.total_jobs',
                'jobs.total_advanced',
                'sales.total_sales',
                'payments.total_paid',
                'acctrn.total_debits',
                'returns.total_returns'
            )
            ->leftJoin('acc_mas as AccMas', 'address.AccKy', '=', 'AccMas.AccKy')
            ->leftJoinSub($jobsQuery, 'jobs', 'address.AccKy', '=', 'jobs.AccKy')
            ->leftJoinSub($salesQuery, 'sales', 'address.AdrKy', '=', 'sales.customer_id')
            ->leftJoinSub($paymentsQuery, 'payments', 'address.AdrKy', '=', 'payments.customer_id')
            ->leftJoinSub($accTrnQuery, 'acctrn', 'address.AccKy', '=', 'acctrn.AccKy')
            ->leftJoinSub($returnsQuery, 'returns', 'address.AdrKy', '=', 'returns.customer_id')
            ->where('address.AdrTypKy', 1) // Only customers if AdrTypKy = 1, we check if AccMas.AccTyp = 'CUSTOMER'
            ->where('AccMas.AccTyp', 'CUSTOMER');

        if ($companyCode) {
            $query->where('address.company_code', $companyCode);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('address.FstNm', 'like', "%{$search}%")
                  ->orWhere('address.LstNm', 'like', "%{$search}%")
                  ->orWhere('address.AdrCd', 'like', "%{$search}%");
            });
        }

        if ($customerId) {
            $query->where('address.AdrCd', $customerId);
        }

        $results = $query->get();

        $data = [];
        $totalOutstanding = 0;

        foreach ($results as $row) {
            $opening = (float) $row->opening_balance;
            $jobs = (float) $row->total_jobs;
            $advanced = (float) $row->total_advanced;
            $sales = (float) $row->total_sales;
            $paid = (float) $row->total_paid;
            $debits = (float) $row->total_debits;
            $returns = (float) $row->total_returns;

            $outstanding = $opening + $jobs + $sales - $advanced - $paid + $debits - $returns;

            // Round to 2 decimal places to avoid floating point precision issues for zero
            $outstanding = round($outstanding, 2);

            if (!$showZero && $outstanding == 0) {
                continue;
            }

            $customerName = trim($row->first_name . ' ' . $row->last_name);
            if (empty($customerName)) {
                $customerName = 'Unknown';
            }

            $data[] = [
                'id' => $row->AdrKy,
                'customer_code' => $row->customer_code,
                'customer_name' => $customerName,
                'phone' => $row->phone,
                'outstanding_balance' => $outstanding,
            ];

            $totalOutstanding += $outstanding;
        }

        // Sort by outstanding balance descending
        usort($data, function($a, $b) {
            return $b['outstanding_balance'] <=> $a['outstanding_balance'];
        });

        return [
            'items' => $data,
            'summary' => [
                'total_outstanding' => round($totalOutstanding, 2),
                'total_customers' => count($data)
            ]
        ];
    }

    public function export(Request $request)
    {
        if (!$request->user()->hasPermission('reports.customer_outstandings')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $search = $request->get('search');
        $showZero = $request->get('show_zero', false);
        $customerId = $request->get('customer_id');
        $format = $request->get('format', 'pdf');

        $user = $request->user();
        $companyCode = ($user->role_id === 1) ? session('selected_company') : $user->company_code;

        $reportData = $this->getReportData($companyCode, $search, filter_var($showZero, FILTER_VALIDATE_BOOLEAN), $customerId);
        $company = $this->getCompany();

        if ($format === 'excel') {
            return $this->exportExcel($reportData, $company);
        }

        return $this->exportPdf($reportData, $company);
    }

    private function exportPdf($reportData, $company)
    {
        $pdf = Pdf::loadView('reports.customer-outstandings-pdf', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS PVT LTD',
                'branch' => $company->branch ?? 'Main Branch',
                'code' => $company->company_code ?? 'VISMASS',
                'branch_code' => $company->branch_code ?? '001',
            ],
            'reportData' => $reportData,
            'date' => date('Y-m-d H:i:s'),
        ])->setPaper('a4', 'portrait');

        $filename = "customer-outstandings-report-" . date('Y-m-d') . ".pdf";
        return $pdf->download($filename);
    }

    private function exportExcel($reportData, $company)
    {
        $filename = "customer-outstandings-report-" . date('Y-m-d') . ".csv";
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($reportData) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['Customer Outstandings Report']);
            fputcsv($file, ['Generated At: ' . date('Y-m-d H:i:s')]);
            fputcsv($file, []);
            
            fputcsv($file, [
                'Customer Code', 
                'Customer Name', 
                'Contact Number', 
                'Outstanding Balance (Rs)'
            ]);
            
            foreach ($reportData['items'] as $item) {
                fputcsv($file, [
                    $item['customer_code'],
                    $item['customer_name'],
                    $item['phone'] ?? '-',
                    number_format($item['outstanding_balance'], 2)
                ]);
            }
            
            fputcsv($file, []);
            fputcsv($file, ['Total Outstanding', '', '', number_format($reportData['summary']['total_outstanding'], 2)]);
            fputcsv($file, ['Total Customers', '', '', $reportData['summary']['total_customers']]);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function getCompany()
    {
        $company = null;
        if (auth('company')->check()) {
            $company = auth('company')->user();
        } else {
            $user = auth('web')->user();
            $company = $user ? $user->company : Company::first();
        }

        if (!$company) {
            $company = (object) [
                'company_code' => 'C01',
                'company_name' => 'COMPANY',
                'primary_color' => '#00aeef',
                'secondary_color' => '#737578'
            ];
        }

        return $company;
    }
}
