<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\SalesTransaction;
use App\Models\Section;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SalesReportController extends Controller
{
    public function index(Request $request)
    {
        // authorization check
        if (! request()->user() || ! request()->user()->hasPermission('reports.sales')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view sales reports.');
        }

        $company = $this->getCompany();
        
        $reportType = $request->get('report_type', 'daily');
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $itemType = $request->get('item_type', 'all');
        $sectionCode = $request->get('section_code');
        $cashierId = $request->get('cashier_id');
        $includeServiceJobs = $request->boolean('include_service_jobs', false);
        
        $filters = [
            'report_type' => $reportType,
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'item_type' => $itemType,
            'section_code' => $sectionCode,
            'cashier_id' => $cashierId,
            'include_service_jobs' => $includeServiceJobs,
        ];
        
        $salesData = null;
        
        if ($fromDate && $toDate) {
            $salesData = $this->getSalesData($reportType, $fromDate, $toDate, $itemType, $sectionCode, $company->company_code, $cashierId, $includeServiceJobs);
        }
        
        // load sections belonging to this company for dropdown
        $sections = Section::where('company_code', $company->company_code)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['section_code', 'name']);

        // supply actual company information; assume authenticated user always has company data
        return Inertia::render('Reports/SalesReport', [
            'company' => $company,
            'filters' => $filters,
            'salesData' => $salesData,
            'sections' => $sections,
            'users' => \App\Models\User::where('company_code', $company->company_code)
                ->where('is_active', true)
                ->whereHas('role', function ($q) {
                    $q->where('level', 'cashier');
                })
                ->get(['id', 'first_name', 'last_name', 'username'])
                ->map(function ($u) {
                    return [
                        'id' => $u->id,
                        'name' => trim($u->first_name . ' ' . $u->last_name) ?: $u->username,
                    ];
                })
                ->sortBy('name')
                ->values()
                ->all(),
            'debug_company_code' => $company->company_code,
        ]);
    }
    
    public function pdf(Request $request)
    {
        // authorization check for pdf download
        if (! request()->user() || ! request()->user()->hasPermission('reports.sales')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view sales reports.');
        }

        $company = $this->getCompany();
        $reportType = $request->get('report_type', 'daily');
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $itemType = $request->get('item_type', 'all');
        $sectionCode = $request->get('section_code');
        $cashierId = $request->get('cashier_id');
        
        if (!$fromDate || !$toDate) {
            return back()->with('error', 'Please select valid date range');
        }
        
        $salesData = $this->getSalesData($reportType, $fromDate, $toDate, $itemType, $sectionCode, $company->company_code, $cashierId);

        // resolve section name if provided
        $sectionName = null;
        if ($sectionCode && $sectionCode !== 'all') {
            $sec = Section::where('company_code', $company->company_code)
                ->where('section_code', $sectionCode)
                ->first(['name']);
            $sectionName = $sec?->name;
        }

        // resolve cashier name if provided
        $cashierName = null;
        if ($cashierId && $cashierId !== 'all') {
            $user = \App\Models\User::find($cashierId);
            $cashierName = $user?->name;
        }
        
        $pdf = Pdf::loadView('reports.sales-pdf', [
            'company' => $company,
            'reportType' => $reportType,
            'salesData' => $salesData,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'sectionName' => $sectionName,
            'cashierName' => $cashierName,
        ]);
        
        $filename = "sales-report-{$reportType}-" . date('Y-m-d') . ".pdf";
        
        return $pdf->download($filename);
    }
    
    private function getSalesData($reportType, $fromDate, $toDate, $itemType = 'all', $sectionCode = null, $companyCode = null, $cashierId = null, $includeServiceJobs = false)
    {
        $from = Carbon::parse($fromDate)->startOfDay();
        $to = Carbon::parse($toDate)->endOfDay();
        
        if ($reportType === 'daily') {
            return $this->getDailySalesData($from, $to, $itemType, $sectionCode, $companyCode, $cashierId, $includeServiceJobs);
        } else {
            return $this->getMonthlySalesData($from, $to, $itemType, $sectionCode, $companyCode, $cashierId, $includeServiceJobs);
        }
    }
    
    private function getDailySalesData($from, $to, $itemType = 'all', $sectionCode = null, $companyCode = null, $cashierId = null, $includeServiceJobs = false)
    {
        $query = SalesTransaction::with('cashier')->whereBetween('transaction_date', [$from, $to])
            ->whereIn('status', ['completed', 'partially_paid']);

        // Filter by cashier
        if ($cashierId && $cashierId !== 'all') {
            $query->where('cashier_id', $cashierId);
        }

        // Filter by company (via sections)
        if ($companyCode) {
            $sectionsQuery = Section::where('company_code', $companyCode);
            if ($sectionCode && $sectionCode !== 'all') {
                $sectionsQuery->where('section_code', $sectionCode);
            }
            $query->whereIn('sales_transactions.section_code', $sectionsQuery->pluck('section_code'));
        } elseif ($sectionCode && $sectionCode !== 'all') {
            $query->where('sales_transactions.section_code', $sectionCode);
        }
        
        $this->applyItemTypeFilter($query, $itemType);
        
        $transactions = $query->orderBy('transaction_date')
            ->orderBy('invoice_no')
            ->get();
            
        if ($includeServiceJobs) {
            $serviceJobsQuery = \App\Models\ServiceJob::whereNotNull('invoice_number')
                ->whereBetween('invoice_date', [$from, $to])
                ->whereIn('status', ['delivered', 'completed']);
                
            if ($companyCode) {
                $serviceJobsQuery->where('company_code', $companyCode);
                if ($sectionCode && $sectionCode !== 'all') {
                    $serviceJobsQuery->where('section_code', $sectionCode);
                }
            } elseif ($sectionCode && $sectionCode !== 'all') {
                $serviceJobsQuery->where('section_code', $sectionCode);
            }
            
            if ($cashierId && $cashierId !== 'all') {
                $serviceJobsQuery->where('created_by', $cashierId);
            }
            
            $serviceJobs = $serviceJobsQuery->with('payments')->get();
            
            foreach ($serviceJobs as $sj) {
                $mockTx = new SalesTransaction();
                $mockTx->transaction_date = \Carbon\Carbon::parse($sj->invoice_date);
                $mockTx->invoice_no = $sj->invoice_number;
                $mockTx->total_amount = $sj->total_amount;
                
                $paymentDetails = [];
                if ($sj->payments && $sj->payments->count() > 0) {
                    foreach ($sj->payments as $payment) {
                        $method = strtolower($payment->method);
                        if ($method === 'applied_credit') $method = 'credit';
                        
                        if (isset($paymentDetails[$method])) {
                            $paymentDetails[$method] += (float)$payment->amount;
                        } else {
                            $paymentDetails[$method] = (float)$payment->amount;
                        }
                    }
                } else {
                    $paymentDetails = ['cash' => $sj->paid_amount ?: $sj->total_amount];
                }
                
                $mockTx->payment_details = $paymentDetails;
                $cashier = \App\Models\User::find($sj->created_by);
                $mockTx->setRelation('cashier', $cashier);
                
                $transactions->push($mockTx);
            }
            
            $transactions = $transactions->sortBy(function($t) {
                return $t->transaction_date->format('Y-m-d') . '_' . $t->invoice_no;
            })->values();
        }
        
        // Group transactions by date
        $dailySummaries = [];
        $transactionsByDate = $transactions->groupBy(function ($transaction) {
            return $transaction->transaction_date->format('Y-m-d');
        });
        
        foreach ($transactionsByDate as $date => $dayTransactions) {
            $totalCash = 0;
            $totalCredit = 0;
            $totalCard = 0;
            $totalCheque = 0;
            $totalBankTransfer = 0;
            
            $dayTransactionList = [];
            
            foreach ($dayTransactions as $transaction) {
                $details = $transaction->payment_details ?? [];
                
                $card = (float)($details['card'] ?? 0);
                $cheque = (float)($details['cheque'] ?? 0);
                $bankTransfer = (float)($details['bank_transfer'] ?? 0);
                $credit = (float)($details['credit'] ?? $details['voucher'] ?? 0);
                $points = (float)($details['points'] ?? 0);
                $cashTendered = (float)($details['cash'] ?? 0);
                
                $otherPayments = $card + $cheque + $bankTransfer + $credit + $points;
                $cashApplied = min($cashTendered, max(0, $transaction->total_amount - $otherPayments));
                
                $totalCash += $cashApplied;
                $totalCredit += $credit;
                $totalCard += $card;
                $totalCheque += $cheque;
                $totalBankTransfer += $bankTransfer;
                
                $dayTransactionList[] = [
                    'invoice_no' => $transaction->invoice_no,
                    'cashier_name' => $transaction->cashier ? trim($transaction->cashier->first_name . ' ' . $transaction->cashier->last_name) ?: $transaction->cashier->username : 'Unknown',
                    'total_amount' => $transaction->total_amount,
                    'cash_payment' => $cashApplied,
                    'voucher_amount' => $credit,
                    'credit_card_amount' => $card,
                    'cheque_payment' => $cheque,
                    'bank_transfer_payment' => $bankTransfer,
                    'points_redeemed' => $points,
                    'transaction_date' => $transaction->transaction_date->format('Y-m-d'),
                ];
            }
            
            $dailySummaries[] = [
                'date' => $date,
                'start_invoice' => $dayTransactions->first()->invoice_no,
                'end_invoice' => $dayTransactions->last()->invoice_no,
                'total_amount' => $dayTransactions->sum('total_amount'),
                'total_cash' => $totalCash,
                'total_credit' => $totalCredit,
                'total_card' => $totalCard,
                'total_cheque' => $totalCheque,
                'total_bank_transfer' => $totalBankTransfer,
                'transaction_count' => $dayTransactions->count(),
                'transactions' => $dayTransactionList,
            ];
        }
        
        $totalCashOverall = 0;
        $totalCreditOverall = 0;
        $totalCardOverall = 0;
        $totalChequeOverall = 0;
        $totalBankTransferOverall = 0;
        $totalPointsOverall = 0;
        
        foreach ($transactions as $transaction) {
            $details = $transaction->payment_details ?? [];
            
            $card = (float)($details['card'] ?? 0);
            $cheque = (float)($details['cheque'] ?? 0);
            $bankTransfer = (float)($details['bank_transfer'] ?? 0);
            $credit = (float)($details['credit'] ?? $details['voucher'] ?? 0);
            $points = (float)($details['points'] ?? 0);
            $cashTendered = (float)($details['cash'] ?? 0);
            
            $otherPayments = $card + $cheque + $bankTransfer + $credit + $points;
            $cashApplied = min($cashTendered, max(0, $transaction->total_amount - $otherPayments));
            
            $totalCashOverall += $cashApplied;
            $totalCreditOverall += $credit;
            $totalCardOverall += $card;
            $totalChequeOverall += $cheque;
            $totalBankTransferOverall += $bankTransfer;
            $totalPointsOverall += $points;
        }
        
        return [
            'daily_summaries' => $dailySummaries,
            'total_amount' => $transactions->sum('total_amount'),
            'total_cash' => $totalCashOverall,
            'total_credit' => $totalCreditOverall,
            'total_card' => $totalCardOverall,
            'total_cheque' => $totalChequeOverall,
            'total_bank_transfer' => $totalBankTransferOverall,
            'total_points' => $totalPointsOverall,
            'transaction_count' => $transactions->count(),
        ];
    }
    
    private function getMonthlySalesData($from, $to, $itemType = 'all', $sectionCode = null, $companyCode = null, $cashierId = null, $includeServiceJobs = false)
    {
        $query = SalesTransaction::whereBetween('transaction_date', [$from, $to])
            ->whereIn('status', ['completed', 'partially_paid']);

        // Filter by cashier
        if ($cashierId && $cashierId !== 'all') {
            $query->where('cashier_id', $cashierId);
        }

        // Filter by company (via sections)
        if ($companyCode) {
            $sectionsQuery = Section::where('company_code', $companyCode);
            if ($sectionCode && $sectionCode !== 'all') {
                $sectionsQuery->where('section_code', $sectionCode);
            }
            $query->whereIn('sales_transactions.section_code', $sectionsQuery->pluck('section_code'));
        } elseif ($sectionCode && $sectionCode !== 'all') {
            $query->where('sales_transactions.section_code', $sectionCode);
        }

        $this->applyItemTypeFilter($query, $itemType);
        
        $transactions = $query->orderBy('transaction_date')
            ->get();
            
        if ($includeServiceJobs) {
            $serviceJobsQuery = \App\Models\ServiceJob::whereNotNull('invoice_number')
                ->whereBetween('invoice_date', [$from, $to])
                ->whereIn('status', ['delivered', 'completed']);
                
            if ($companyCode) {
                $serviceJobsQuery->where('company_code', $companyCode);
                if ($sectionCode && $sectionCode !== 'all') {
                    $serviceJobsQuery->where('section_code', $sectionCode);
                }
            } elseif ($sectionCode && $sectionCode !== 'all') {
                $serviceJobsQuery->where('section_code', $sectionCode);
            }
            
            if ($cashierId && $cashierId !== 'all') {
                $serviceJobsQuery->where('created_by', $cashierId);
            }
            
            $serviceJobs = $serviceJobsQuery->with('payments')->get();
            
            foreach ($serviceJobs as $sj) {
                $mockTx = new SalesTransaction();
                $mockTx->transaction_date = \Carbon\Carbon::parse($sj->invoice_date);
                $mockTx->invoice_no = $sj->invoice_number;
                $mockTx->total_amount = $sj->total_amount;
                
                $paymentDetails = [];
                if ($sj->payments && $sj->payments->count() > 0) {
                    foreach ($sj->payments as $payment) {
                        $method = strtolower($payment->method);
                        if ($method === 'applied_credit') $method = 'credit';
                        
                        if (isset($paymentDetails[$method])) {
                            $paymentDetails[$method] += (float)$payment->amount;
                        } else {
                            $paymentDetails[$method] = (float)$payment->amount;
                        }
                    }
                } else {
                    $paymentDetails = ['cash' => $sj->paid_amount ?: $sj->total_amount];
                }
                
                $mockTx->payment_details = $paymentDetails;
                $cashier = \App\Models\User::find($sj->created_by);
                $mockTx->setRelation('cashier', $cashier);
                
                $transactions->push($mockTx);
            }
            
            $transactions = $transactions->sortBy(function($t) {
                return $t->transaction_date->format('Y-m-d') . '_' . $t->invoice_no;
            })->values();
        }
        
        // Group transactions by date for daily summaries
        $dailySummaries = [];
        $transactionsByDate = $transactions->groupBy(function ($transaction) {
            return $transaction->transaction_date->format('Y-m-d');
        });
        
        foreach ($transactionsByDate as $date => $dayTransactions) {
            $totalCash = 0;
            $totalCredit = 0;
            $totalCard = 0;
            $totalCheque = 0;
            $totalBankTransfer = 0;
            
            foreach ($dayTransactions as $transaction) {
                $details = $transaction->payment_details ?? [];
                
                $card = (float)($details['card'] ?? 0);
                $cheque = (float)($details['cheque'] ?? 0);
                $bankTransfer = (float)($details['bank_transfer'] ?? 0);
                $credit = (float)($details['credit'] ?? $details['voucher'] ?? 0);
                $points = (float)($details['points'] ?? 0);
                $cashTendered = (float)($details['cash'] ?? 0);
                
                $otherPayments = $card + $cheque + $bankTransfer + $credit + $points;
                $cashApplied = min($cashTendered, max(0, $transaction->total_amount - $otherPayments));
                
                $totalCash += $cashApplied;
                $totalCredit += $credit;
                $totalCard += $card;
                $totalCheque += $cheque;
                $totalBankTransfer += $bankTransfer;
            }
            
            $dailySummaries[] = [
                'date' => $date,
                'start_invoice' => $dayTransactions->first()->invoice_no,
                'end_invoice' => $dayTransactions->last()->invoice_no,
                'total_amount' => $dayTransactions->sum('total_amount'),
                'total_cash' => $totalCash,
                'total_credit' => $totalCredit,
                'total_card' => $totalCard,
                'total_cheque' => $totalCheque,
                'total_bank_transfer' => $totalBankTransfer,
                'transaction_count' => $dayTransactions->count(),
            ];
        }
        
        $totalCashOverall = 0;
        $totalCreditOverall = 0;
        $totalCardOverall = 0;
        $totalChequeOverall = 0;
        $totalBankTransferOverall = 0;
        $totalPointsOverall = 0;
        
        foreach ($transactions as $transaction) {
            $details = $transaction->payment_details ?? [];
            
            $card = (float)($details['card'] ?? 0);
            $cheque = (float)($details['cheque'] ?? 0);
            $bankTransfer = (float)($details['bank_transfer'] ?? 0);
            $credit = (float)($details['credit'] ?? $details['voucher'] ?? 0);
            $points = (float)($details['points'] ?? 0);
            $cashTendered = (float)($details['cash'] ?? 0);
            
            $otherPayments = $card + $cheque + $bankTransfer + $credit + $points;
            $cashApplied = min($cashTendered, max(0, $transaction->total_amount - $otherPayments));
            
            $totalCashOverall += $cashApplied;
            $totalCreditOverall += $credit;
            $totalCardOverall += $card;
            $totalChequeOverall += $cheque;
            $totalBankTransferOverall += $bankTransfer;
            $totalPointsOverall += $points;
        }
        
        return [
            'daily_summaries' => $dailySummaries,
            'total_amount' => $transactions->sum('total_amount'),
            'total_cash' => $totalCashOverall,
            'total_credit' => $totalCreditOverall,
            'total_card' => $totalCardOverall,
            'total_cheque' => $totalChequeOverall,
            'total_bank_transfer' => $totalBankTransferOverall,
            'total_points' => $totalPointsOverall,
            'transaction_count' => $transactions->count(),
        ];
    }

    private function applyItemTypeFilter($query, string $itemType): void
    {
        if ($itemType === 'all') {
            return;
        }

        // Keep existing UI value "stationary", map it to itemmaster's "product" type.
        $normalizedItemType = $itemType === 'stationary' ? 'product' : $itemType;

        $query->whereExists(function ($subQuery) use ($normalizedItemType) {
            $subQuery->select(DB::raw(1))
                ->from('sales_transaction_items as sti')
                ->join('itemmaster as im', function ($join) {
                    $join->on('im.ItmKy', '=', 'sti.product_id')
                        ->orOn('im.ItemCode', '=', 'sti.item_code');
                })
                ->whereColumn('sti.sales_transaction_id', 'sales_transactions.id')
                ->where('im.item_type', $normalizedItemType);
        });
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
