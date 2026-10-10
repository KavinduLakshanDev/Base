<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Company;
use App\Models\CustomerPayment;
use App\Models\CustomerReturn;
use App\Models\SalesTransaction;
use App\Models\Section;
use App\Models\AccTrn;
use App\Models\ServiceJob;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerLedgerController extends Controller
{
    public function index(Request $request)
    {
        $company = $this->getCompany();

        $customers = Address::where('company_code', $company->company_code ?? 'C01')
            ->whereHas('accMas', function ($q) {
                $q->where('AccTyp', 'CUSTOMER');
            })
            ->with(['accMas', 'section'])
            ->orderBy('FstNm')
            ->get();

        $sections = Section::where('company_code', $company->company_code ?? 'C01')->get();

        $data = [
            'customers' => $customers,
            'company' => $company,
            'sections' => $sections,
        ];

        // If customer is selected, fetch transactions
        if ($request->customer_id) {
            $customer = Address::where('AdrCd', $request->customer_id)
                ->where('company_code', $company->company_code ?? 'C01')
                ->with(['accMas', 'section'])
                ->first();
            
            if ($customer) {
                $fromDate = $request->from_date ? Carbon::parse($request->from_date)->startOfDay() : Carbon::now()->subMonths(3)->startOfDay();
                $toDate = $request->to_date ? Carbon::parse($request->to_date)->endOfDay() : Carbon::now()->endOfDay();

                // Get opening balance - sales minus payments plus cheque returns minus customer returns before fromDate
                $salesBeforeDate = SalesTransaction::where('customer_id', $customer->AdrKy)
                    ->where('transaction_date', '<', $fromDate)
                    ->sum('total_amount');
                
                $paymentsBeforeDate = CustomerPayment::where('customer_id', $customer->AdrKy)
                    ->where('date', '<', $fromDate)
                    ->whereNotIn('method', ['applied_credit', 'exchange_balance_due', 'credit_applied'])
                    ->sum('amount');

                $returnsBeforeDate = AccTrn::where('AccKy', $customer->AccKy)
                    ->where('TrnDt', '<', $fromDate)
                    ->where('FInAct', true)
                    ->where('Status', 'A')
                    ->where('Amt', '>', 0)
                    ->where(function ($q) {
                        $q->where('Reason', 'like', 'Cheque Return%')
                          ->orWhereNotNull('original_payment_id');
                    })
                    ->sum('Amt');

                $custReturnsBeforeDate = CustomerReturn::where('customer_id', $customer->AdrKy)
                    ->where('return_date', '<', $fromDate)
                    ->sum('total_return_amount');
                
                $serviceJobsBeforeDate = ServiceJob::where('AccKy', $customer->AccKy)
                    ->where('status', '!=', 'cancelled')
                    ->where('created_at', '<', $fromDate)
                    ->sum('total_amount');
                
                $openingBalance = $salesBeforeDate + $serviceJobsBeforeDate - $paymentsBeforeDate + $returnsBeforeDate - $custReturnsBeforeDate;

                // Get sales transactions for the period
                $sales = SalesTransaction::where('customer_id', $customer->AdrKy)
                    ->whereBetween('transaction_date', [$fromDate, $toDate])
                    ->get()
                    ->map(function($sale) {
                        return [
                            'date' => $sale->transaction_date,
                            'type' => 'sale',
                            'sort_key' => Carbon::parse($sale->transaction_date)->format('Y-m-d') . ' ' . $sale->created_at->format('H:i:s'),
                            'description' => 'Sale - Invoice #' . $sale->invoice_no,
                            'invoice_no' => $sale->invoice_no,
                            'debit' => $sale->total_amount,
                            'credit' => 0,
                        ];
                    });

                // Get payment transactions for the period
                $paymentsQuery = CustomerPayment::with(['salesTransaction:id,invoice_no', 'serviceJob:id,job_number'])
                    ->where('customer_id', $customer->AdrKy)
                    ->where('status', 'completed')
                    ->whereNotIn('method', ['applied_credit', 'exchange_balance_due', 'credit_applied'])
                    ->whereBetween('date', [$fromDate, $toDate])
                    ->get();

                $invoiceIds = [];
                $jobIds = [];
                foreach ($paymentsQuery as $payment) {
                    if (is_array($payment->invoice_allocations)) {
                        foreach ($payment->invoice_allocations as $allocation) {
                            $invId = (int) ($allocation['invoice_id'] ?? -1);
                            if ($invId > 0) $invoiceIds[] = $invId;
                            $jobId = (int) ($allocation['service_job_id'] ?? -1);
                            if ($jobId > 0) $jobIds[] = $jobId;
                        }
                    }
                }
                
                $invoiceMap = empty($invoiceIds) ? collect() : \App\Models\SalesTransaction::whereIn('id', array_unique($invoiceIds))->pluck('invoice_no', 'id');
                $jobMap = empty($jobIds) ? collect() : \App\Models\ServiceJob::whereIn('id', array_unique($jobIds))->pluck('job_number', 'id');

                $payments = $paymentsQuery->map(function($payment) use ($invoiceMap, $jobMap) {
                    $description = 'Payment';
                    if ($payment->method) {
                        $description .= ' - ' . ucfirst($payment->method);
                    }
                    if ($payment->cheque_no) {
                        $description .= ' (Cheque: ' . $payment->cheque_no . ')';
                    }
                    
                    $paidInvoices = [];
                    if ($payment->salesTransaction) {
                        $paidInvoices[] = $payment->salesTransaction->invoice_no;
                    }
                    if ($payment->serviceJob) {
                        $paidInvoices[] = $payment->serviceJob->job_number;
                    }
                    if (is_array($payment->invoice_allocations)) {
                        foreach ($payment->invoice_allocations as $allocation) {
                            $invId = (int) ($allocation['invoice_id'] ?? -1);
                            if ($invId === 0) {
                                $paidInvoices[] = 'OPENING-BAL';
                            } elseif ($invId > 0) {
                                if (isset($invoiceMap[$invId])) $paidInvoices[] = $invoiceMap[$invId];
                            }
                            $jobId = (int) ($allocation['service_job_id'] ?? -1);
                            if ($jobId > 0) {
                                if (isset($jobMap[$jobId])) $paidInvoices[] = $jobMap[$jobId];
                            }
                        }
                    }
                    
                    $invoiceNoDisplay = count($paidInvoices) > 0 ? implode(', ', array_unique($paidInvoices)) : ($payment->reference ?? '-');

                    return [
                        'date' => $payment->date,
                        'type' => 'payment',
                        'sort_key' => Carbon::parse($payment->date)->format('Y-m-d') . ' ' . $payment->created_at->format('H:i:s'),
                        'description' => $description,
                        'invoice_no' => $invoiceNoDisplay,
                        'debit' => 0,
                        'credit' => $payment->amount,
                    ];
                });

                // Get cheque return transactions for the period (returns + service charges)
                $chequeReturns = AccTrn::where('AccKy', $customer->AccKy)
                    ->whereBetween('TrnDt', [$fromDate, $toDate])
                    ->where('FInAct', true)
                    ->where('Status', 'A')
                    ->where('Amt', '>', 0)
                    ->where(function ($q) {
                        $q->where('Reason', 'like', 'Cheque Return%')
                          ->orWhereNotNull('original_payment_id');
                    })
                    ->get()
                    ->map(function ($return) {
                        $description = $return->Reason ?: 'Cheque Return';
                        if (!empty($return->ChqueNo)) {
                            $description .= ' (Cheque: ' . $return->ChqueNo . ')';
                        }
                        return [
                            'date' => $return->TrnDt,
                            'type' => 'cheque_return',
                            'sort_key' => Carbon::parse($return->TrnDt)->format('Y-m-d') . ' ' . $return->created_at->format('H:i:s'),
                            'description' => $description,
                            'invoice_no' => $return->TrnNo ?? '-',
                            'debit' => (float) $return->Amt,
                            'credit' => 0,
                        ];
                    });

                // Get customer return transactions for the period
                $custReturns = CustomerReturn::where('customer_id', $customer->AdrKy)
                    ->whereBetween('return_date', [$fromDate, $toDate])
                    ->get()
                    ->map(function ($ret) {
                        return [
                            'date' => $ret->return_date,
                            'type' => 'return',
                            'sort_key' => Carbon::parse($ret->return_date)->format('Y-m-d') . ' ' . $ret->created_at->format('H:i:s'),
                            'description' => 'Return - #' . $ret->return_no . ($ret->reason ? ' (' . $ret->reason . ')' : ''),
                            'invoice_no' => $ret->return_no,
                            'debit' => 0,
                            'credit' => $ret->total_return_amount,
                        ];
                    });
                
                // Get service job transactions for the period
                // Note: use endOfDay() on toDate (already applied above) so jobs
                // created any time during the to_date day are included.
                $serviceJobs = ServiceJob::where('AccKy', $customer->AccKy)
                    ->where('status', '!=', 'cancelled')
                    ->whereBetween('created_at', [$fromDate, $toDate])
                    ->get()
                    ->map(function ($job) {
                        return [
                            'date' => $job->created_at,
                            'type' => 'service_job',
                            'sort_key' => Carbon::parse($job->created_at)->format('Y-m-d H:i:s'),
                            'description' => 'Service Job - ' . $job->job_number,
                            'invoice_no' => $job->job_number,
                            'debit' => (float) $job->total_amount,
                            'credit' => 0,
                        ];
                    });

                // Get credit_applied transactions for the period (CR balance used to settle a sale)
                $creditApplied = CustomerPayment::with(['salesTransaction:id,invoice_no'])
                    ->where('customer_id', $customer->AdrKy)
                    ->where('status', 'completed')
                    ->whereIn('method', ['credit_applied', 'applied_credit'])
                    ->whereBetween('date', [$fromDate, $toDate])
                    ->get()
                    ->map(function ($payment) {
                        $invoiceNo = $payment->salesTransaction?->invoice_no ?? $payment->reference ?? '-';
                        return [
                            'date'        => $payment->date,
                            'type'        => 'credit_applied',
                            'sort_key'    => Carbon::parse($payment->date)->format('Y-m-d') . ' ' . $payment->created_at->format('H:i:s'),
                            'description' => 'Credit Balance Applied (' . number_format($payment->amount, 2) . ')',
                            'invoice_no'  => $invoiceNo,
                            'debit'       => 0,
                            'credit'      => 0,
                        ];
                    });

                // Merge and sort all transactions by date, then sales/jobs before payments/returns
                $allTransactions = $sales->concat($serviceJobs)->concat($chequeReturns)->concat($payments)->concat($custReturns)->concat($creditApplied)->sortBy('sort_key')->values();

                $balance = $openingBalance;
                $ledgerTransactions = [];

                foreach ($allTransactions as $index => $trn) {
                    $balance += $trn['debit'] - $trn['credit'];

                    $ledgerTransactions[] = [
                        'id' => $index + 1,
                        'date' => $trn['date'],
                        'description' => $trn['description'],
                        'invoice_no' => $trn['invoice_no'],
                        'debit' => $trn['debit'],
                        'credit' => $trn['credit'],
                        'balance' => $balance,
                    ];
                }

                $data['selectedCustomer'] = $customer;
                $data['transactions'] = $ledgerTransactions;
                $data['fromDate'] = $fromDate->format('Y-m-d');
                $data['toDate'] = $toDate->format('Y-m-d');
                $data['openingBalance'] = $openingBalance;
                $data['closingBalance'] = $balance;
            }
        }

        return Inertia::render('Reports/CustomerLedger', $data);
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
                'name' => 'VISION COPIER',
                'primary_color' => '#00aeef',
                'secondary_color' => '#737578'
            ];
        }

        return $company;
    }
}
