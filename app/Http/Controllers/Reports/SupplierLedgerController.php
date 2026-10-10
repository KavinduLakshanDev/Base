<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Company;
use App\Models\Purchase;
use App\Models\SupplierPayment;
use App\Models\SupplierReturn;
use App\Models\Section;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierLedgerController extends Controller
{
    public function index(Request $request)
    {
        $company = $this->getCompany();

        $suppliers = Address::where('company_code', $company->company_code ?? 'C01')
            ->whereHas('accMas', function ($q) {
                $q->where('AccTyp', 'SUPPLIER');
            })
            ->with(['accMas', 'section'])
            ->orderBy('FstNm')
            ->get();

        $sections = Section::where('company_code', $company->company_code ?? 'C01')->get();

        $data = [
            'suppliers' => $suppliers,
            'company' => $company,
            'sections' => $sections,
        ];

        // If supplier is selected, fetch transactions
        if ($request->supplier_id) {
            $supplier = Address::where('AdrCd', $request->supplier_id)
                ->where('company_code', $company->company_code ?? 'C01')
                ->with(['accMas', 'section'])
                ->first();
            
            if ($supplier) {
                $fromDate = $request->from_date ? Carbon::parse($request->from_date) : Carbon::now()->subMonths(3);
                $toDate = $request->to_date ? Carbon::parse($request->to_date) : Carbon::now();

                // Get opening balance - purchases minus (payments + returns) before fromDate
                $purchasesBeforeDate = Purchase::where('SuppCode', $supplier->AdrCd)
                    ->where('GRNDate', '<', $fromDate)
                    ->sum('TotalVal');
                
                $paymentsBeforeDate = SupplierPayment::where('supplier_code', $supplier->AdrCd)
                    ->where('payment_date', '<', $fromDate)
                    ->sum('paid_amount');

                $returnsBeforeDate = SupplierReturn::where('supplier_code', $supplier->AdrCd)
                    ->where('return_date', '<', $fromDate)
                    ->sum('return_value');
                
                $openingBalance = $purchasesBeforeDate - ($paymentsBeforeDate + $returnsBeforeDate);

                // Get purchase transactions for the period (Increases Liability -> Credit)
                $purchases = Purchase::where('SuppCode', $supplier->AdrCd)
                    ->whereBetween('GRNDate', [$fromDate, $toDate])
                    ->get()
                    ->map(function($purchase) {
                        return [
                            'date' => $purchase->GRNDate,
                            'type' => 'purchase',
                            'sort_key' => Carbon::parse($purchase->GRNDate)->format('Y-m-d H:i:s') . '_1',
                            'description' => 'Purchase - GRN #' . $purchase->PurchaseNo,
                            'reference' => $purchase->SuppInvNo ?? 'GRN-' . $purchase->PurchaseNo,
                            'debit' => 0,
                            'credit' => $purchase->TotalVal,
                        ];
                    });

                // Get payment transactions for the period (Decreases Liability -> Debit)
                $payments = SupplierPayment::where('supplier_code', $supplier->AdrCd)
                    ->whereBetween('payment_date', [$fromDate, $toDate])
                    ->get()
                    ->map(function($payment) {
                        $description = 'Payment';
                        if ($payment->payment_method) {
                            $description .= ' - ' . ucfirst($payment->payment_method);
                        }
                        if ($payment->cheque_no) {
                            $description .= ' (Cheque: ' . $payment->cheque_no . ')';
                        }
                        return [
                            'date' => $payment->payment_date,
                            'type' => 'payment',
                            'sort_key' => Carbon::parse($payment->payment_date)->format('Y-m-d H:i:s') . '_2',
                            'description' => $description,
                            'reference' => $payment->payment_no ?? '-',
                            'debit' => $payment->paid_amount,
                            'credit' => 0,
                        ];
                    });

                // Get return transactions for the period (Decreases Liability -> Debit)
                $returns = SupplierReturn::where('supplier_code', $supplier->AdrCd)
                    ->whereBetween('return_date', [$fromDate, $toDate])
                    ->get()
                    ->map(function($ret) {
                        return [
                            'date' => $ret->return_date,
                            'type' => 'return',
                            'sort_key' => Carbon::parse($ret->return_date)->format('Y-m-d H:i:s') . '_2',
                            'description' => 'Return - ' . ($ret->reason ?: 'Supplier Return'),
                            'reference' => $ret->supplier_invoice_no ?? '-',
                            'debit' => $ret->return_value,
                            'credit' => 0,
                        ];
                    });

                // Merge and sort all transactions
                $allTransactions = $purchases->concat($payments)->concat($returns)->sortBy('sort_key')->values();

                $balance = $openingBalance;
                $ledgerTransactions = [];

                foreach ($allTransactions as $index => $trn) {
                    $balance += $trn['credit'] - $trn['debit'];

                    $ledgerTransactions[] = [
                        'id' => $index + 1,
                        'date' => $trn['date'],
                        'description' => $trn['description'],
                        'reference' => $trn['reference'],
                        'debit' => $trn['debit'],
                        'credit' => $trn['credit'],
                        'balance' => $balance,
                    ];
                }

                $data['selectedSupplier'] = $supplier;
                $data['transactions'] = $ledgerTransactions;
                $data['fromDate'] = $fromDate->format('Y-m-d');
                $data['toDate'] = $toDate->format('Y-m-d');
                $data['openingBalance'] = $openingBalance;
                $data['closingBalance'] = $balance;
            }
        }

        return Inertia::render('Reports/SupplierLedger', $data);
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
