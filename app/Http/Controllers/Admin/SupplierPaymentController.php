<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupplierPayment;
use App\Models\Address;
use App\Models\AccMas;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Dompdf\Dompdf;
use Dompdf\Options;

class SupplierPaymentController extends Controller
{
    /**
     * Display a listing of supplier payments
     */
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('supplier_payments.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view supplier payments.');
        }

        /** @var \App\Models\User $user */
        $user = $request->user();

        // Get supplier payments with filtering and pagination
        $paymentsQuery = \App\Models\SupplierPayment::with(['bankAccount'])
            ->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc');

        // Apply company/section filtering based on user role
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) { // Branch level
                $paymentsQuery->where('section_code', $user->section_code);
            } else { // Company level
                $paymentsQuery->where('company_code', $user->company_code);
            }
        }

        // Apply filters
        if ($request->filled('supplier_code')) {
            $paymentsQuery->where('supplier_code', 'like', '%' . $request->supplier_code . '%');
        }

        if ($request->filled('payment_method')) {
            $paymentsQuery->where('payment_method', $request->payment_method);
        }

        if ($request->filled('status')) {
            $paymentsQuery->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $paymentsQuery->where('payment_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $paymentsQuery->where('payment_date', '<=', $request->date_to);
        }

        $payments = $paymentsQuery->paginate(15)->through(function ($payment) {
            return [
                'id' => $payment->id,
                'payment_no' => $payment->payment_no,
                'supplier_code' => $payment->supplier_code,
                'supplier_name' => $payment->supplier_name,
                'supplier_address' => $payment->supplier_address,
                'supplier_tel' => $payment->supplier_tel,
                'payment_method' => $payment->payment_method,
                'paid_amount' => $payment->paid_amount,
                'payment_date' => $payment->payment_date?->format('Y-m-d'),
                'bank_name' => $payment->bank_name ?: $payment->cheque_bank_name ?: $payment->transfer_bank_name,
                'bank_reference_no' => $payment->bank_reference_no ?: $payment->cheque_no ?: $payment->transfer_transaction_id,
                'notes' => $payment->notes,
                'status' => $payment->status,
                'created_by' => $payment->created_by,
                'created_at' => $payment->created_at?->format('Y-m-d H:i:s'),
                'bank_account' => $payment->bankAccount ? [
                    'account_name' => $payment->bankAccount->account_name,
                    'account_number' => $payment->bankAccount->account_number,
                    'bank_name' => $payment->bankAccount->bank_name,
                ] : null,
            ];
        });

        // Get bank accounts for the create payment form
        $bankAccountsQuery = \App\Models\BankAccount::where('status', 'active');

        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) { // Branch level
                $bankAccountsQuery->where('section_code', $user->section_code);
            } else { // Company level
                $bankAccountsQuery->where('company_code', $user->company_code);
            }
        }

        $bankAccounts = $bankAccountsQuery->orderBy('bank_name')->get();

        // Get summary statistics
        $totalPayments = $paymentsQuery->sum('paid_amount');
        $paymentCount = $paymentsQuery->count();

        return Inertia::render('admin/supplier-payments/index', [
            'payments' => $payments,
            'bankAccounts' => $bankAccounts,
            'filters' => $request->only(['supplier_code', 'payment_method', 'status', 'date_from', 'date_to']),
            'summary' => [
                'total_payments' => $totalPayments,
                'payment_count' => $paymentCount,
            ],
        ]);
    }

    /**
     * Search suppliers for payment
     */
    public function searchSuppliers(Request $request)
    {
        if (!request()->user()->hasPermission('supplier_payments.view')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        /** @var \App\Models\User $user */
        $user = $request->user();
        $search = $request->query('search');

        $suppliersQuery = Address::select('address.AdrKy', 'address.AdrCd', 'address.FstNm', 'address.LstNm', 'address.TP1', 'address.Address')
            ->join('acc_mas', 'address.AccKy', '=', 'acc_mas.AccKy')
            ->where('address.AdrTypKy', 4)
            ->where('acc_mas.AccTyp', 'SUPPLIER')
            ->whereNotNull('address.AccKy');

        if ($search) {
            // split on whitespace so "John Doe" searches both parts
            $terms = preg_split('/\s+/', trim($search));
            $suppliersQuery->where(function ($q) use ($terms) {
                foreach ($terms as $term) {
                    $q->where(function ($q2) use ($term) {
                        $q2->where('address.AdrCd', 'like', "%{$term}%")
                           ->orWhere('address.FstNm', 'like', "%{$term}%")
                           ->orWhere('address.LstNm', 'like', "%{$term}%")
                           ->orWhere('address.TP1', 'like', "%{$term}%");
                    });
                }
            });
        }

        if ($user && $user->role_id !== 1) {
            if ($user->role_id === 3) {
                $suppliersQuery->where('address.section_code', $user->section_code);
            } else {
                $suppliersQuery->where('address.company_code', $user->company_code);
            }
        }


        $suppliers = $suppliersQuery->limit(10)->get();

        return response()->json($suppliers);
    }

    /**
     * Show the form for creating a new supplier payment
     */
    public function create(Request $request)
    {
        if (!request()->user()->hasPermission('supplier_payments.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create supplier payments.');
        }

        /** @var \App\Models\User $user */
        $user = $request->user();

        // Get suppliers based on user role
        $suppliersQuery = Address::select('address.AdrKy', 'address.AdrCd', 'address.FstNm', 'address.LstNm', 'address.Address', 'address.TP1', 'address.AccKy')

            ->join('acc_mas', 'address.AccKy', '=', 'acc_mas.AccKy')
            ->where('address.AdrTypKy', 4) // 4 = Supplier type
            ->where('acc_mas.AccTyp', 'SUPPLIER')
            ->whereNotNull('address.AccKy');

        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) { // Branch level
                $suppliersQuery->where('address.section_code', $user->section_code);
            } else { // Company level
                $suppliersQuery->where('address.company_code', $user->company_code);
            }
        }



        $suppliers = $suppliersQuery->orderBy('address.AdrCd')->get();

        // Calculate outstanding balances dynamically from payment allocations
        // Get all purchases with positive TotalVal
        $allPurchases = DB::table('purchase')
            ->where('Status', 'A')
            ->where('TotalVal', '>', 0)
            ->select('PurchaseKey', 'SuppCode', 'TotalVal')
            ->get();

        // Get all completed payment allocations
        $allPayments = SupplierPayment::where('status', 'completed')
            ->whereNotNull('invoice_allocations')
            ->get();

        // Build map of invoice_id => total_paid
        $allocationTotals = [];
        foreach ($allPayments as $payment) {
            if (is_array($payment->invoice_allocations)) {
                foreach ($payment->invoice_allocations as $allocation) {
                    $invoiceId = $allocation['invoice_id'] ?? null;
                    $amount = (float)($allocation['amount'] ?? 0);
                    if ($invoiceId && $amount > 0) {
                        $allocationTotals[$invoiceId] = ($allocationTotals[$invoiceId] ?? 0) + $amount;
                    }
                }
            }
        }

        // Calculate actual balance per supplier
        $supplierBalances = [];
        foreach ($allPurchases as $purchase) {
            $paid = $allocationTotals[$purchase->PurchaseKey] ?? 0;
            $balance = round((float)$purchase->TotalVal - $paid, 2);
            if ($balance > 0) {
                $supplierBalances[$purchase->SuppCode] = ($supplierBalances[$purchase->SuppCode] ?? 0) + $balance;
            }
        }

        // Map outstanding balances to suppliers and filter only those with balance > 0
        $suppliersWithBalance = $suppliers->map(function ($supplier) use ($supplierBalances) {
            $supplier->current_balance = $supplierBalances[$supplier->AdrCd] ?? 0;
            return $supplier;
        })->filter(function ($supplier) {
            return $supplier->current_balance > 0;
        })->values();

        // also provide bank accounts for the payment form (same logic as index)
        $bankAccountsQuery = \App\Models\BankAccount::where('status', 'active');
        $mainCashAccountQuery = \App\Models\FinanceAccount::where('account_type', 'cash');
        
        if ($user && $user->role_id !== 1) {
            if ($user->role_id === 3) {
                $bankAccountsQuery->where('section_code', $user->section_code);
                $mainCashAccountQuery->where('section_code', $user->section_code);
            } else {
                $bankAccountsQuery->where('company_code', $user->company_code);
                $mainCashAccountQuery->where('company_code', $user->company_code);
            }
        }
        $bankAccounts = $bankAccountsQuery->orderBy('bank_name')->get();
        $mainCashAccount = $mainCashAccountQuery->first();

        return Inertia::render('admin/supplier-payments/create', [
            'suppliersWithBalance' => $suppliersWithBalance,
            'bankAccounts' => $bankAccounts,
            'mainCashAccount' => $mainCashAccount,
        ]);
    }

    /**
     * Get supplier details by ID
     */
    public function getSupplierDetails(Request $request)
    {
        if (!request()->user()->hasPermission('supplier_payments.view')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $supplierId = $request->query('supplier_id');

            if (!$supplierId) {
                Log::warning('Supplier ID not provided in request');
                return response()->json(['error' => 'Supplier ID is required'], 400);
            }

            Log::info('Fetching supplier details for ID: ' . $supplierId);

            $supplier = Address::with('account')
                ->where('AdrKy', $supplierId)
                ->where('AdrTypKy', 4)
                ->first();

            if (!$supplier) {
                Log::warning('Supplier not found for ID: ' . $supplierId);
                return response()->json(['error' => 'Supplier not found'], 404);
            }

            Log::info('Supplier found: ' . $supplier->AdrCd . ', AccKy: ' . ($supplier->AccKy ?? 'NULL'));

            // Calculate balance from purchases and payments
            // Get total purchases for this supplier
            $totalPurchases = DB::table('purchase')
                ->where(function ($query) use ($supplier) {
                    $query->where('SuppCode', $supplier->AdrCd)
                          ->orWhere('AccKy', $supplier->AccKy);
                })
                ->sum('TotalVal');

            // Get total payments for this supplier
            $totalPayments = SupplierPayment::where('supplier_code', $supplier->AdrCd)
                ->sum('paid_amount');

            // Get total returns for this supplier
            $totalReturns = \App\Models\SupplierReturn::where('supplier_code', $supplier->AdrCd)
                ->where('status', 'approved')
                ->get()
                ->sum(function($ret) {
                    return (float)$ret->quantity * (float)$ret->return_value;
                });

            // Calculate current balance (purchases - payments - returns)
            $balance = $totalPurchases - $totalPayments - $totalReturns;
            
            Log::info('Balance calculation for ' . $supplier->AdrCd . ' - Purchases: ' . $totalPurchases . ', Payments: ' . $totalPayments . ', Balance: ' . $balance);

            return response()->json([
                'code' => $supplier->AdrCd,
                'name' => trim(($supplier->FstNm ?? '') . ' ' . ($supplier->MidNm ?? '') . ' ' . ($supplier->LstNm ?? '')),
                'address' => $supplier->Address,
                'tel' => $supplier->TP1,
                'current_balance' => $balance,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting supplier details: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Get pending invoices for a supplier
     */
    public function getPendingInvoices(Request $request)
    {
        if (!$request->user()->hasPermission('supplier_payments.view')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $supplierId = $request->query('supplier_id');

            if (!$supplierId) {
                return response()->json([]);
            }

            $supplier = Address::where('AdrKy', $supplierId)->first();
            if (!$supplier) {
                return response()->json([]);
            }

            // Fetch all active purchases for this supplier (match by SuppCode only)
            $invoices = DB::table('purchase')
                ->where('SuppCode', $supplier->AdrCd)
                ->where('Status', 'A')
                ->orderBy('PurchaseNo', 'asc')
                ->get();

            // Get all completed payments for this supplier to calculate actual balances dynamically
            $payments = SupplierPayment::where('supplier_code', $supplier->AdrCd)
                ->where('status', 'completed')
                ->whereNotNull('invoice_allocations')
                ->get();

            // Build a map of invoice_id => total_paid from all payment allocations
            $allocationTotals = [];
            foreach ($payments as $payment) {
                if (is_array($payment->invoice_allocations)) {
                    foreach ($payment->invoice_allocations as $allocation) {
                        $invoiceId = $allocation['invoice_id'] ?? null;
                        $amount = (float)($allocation['amount'] ?? 0);
                        if ($invoiceId && $amount > 0) {
                            $allocationTotals[$invoiceId] = ($allocationTotals[$invoiceId] ?? 0) + $amount;
                        }
                    }
                }
            }

            // Calculate actual balance for each invoice and filter only pending ones
            $pendingInvoices = $invoices->filter(function ($invoice) use ($allocationTotals) {
                $totalVal = (float)$invoice->TotalVal;
                $paidAmount = $allocationTotals[$invoice->PurchaseKey] ?? 0;
                $balance = round($totalVal - $paidAmount, 2);
                return $balance > 0;
            })->map(function ($invoice) use ($allocationTotals) {
                $totalVal = (float)$invoice->TotalVal;
                $paidAmount = $allocationTotals[$invoice->PurchaseKey] ?? 0;
                $balance = round($totalVal - $paidAmount, 2);

                return [
                    'id' => $invoice->PurchaseKey,
                    'invoice_no' => $invoice->company_code . '-' . sprintf('%06d', $invoice->PurchaseNo),
                    'supplier_invoice_no' => $invoice->SuppInvNo,
                    'transaction_date' => $invoice->GRNDate,
                    'total_amount' => $totalVal,
                    'balance_amount' => $balance,
                ];
            })->values();

            return response()->json($pendingInvoices);
        } catch (\Exception $e) {
            Log::error('Error in getPendingInvoices: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Store a newly created supplier payment
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('supplier_payments.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create supplier payments.');
        }

        $validated = $request->validate([
            'supplier_id' => 'required|exists:address,AdrKy',
            'payment_method' => 'required|in:Cash,Cheque,Bank,Online Transfer',
            'paid_amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            
            // Bank selection is mandatory for non-cash methods
            'selected_bank_id' => 'required_if:payment_method,Cheque,Bank,Online Transfer|exists:bank_accounts,id',
            
            // Cheque fields
            'cheque_no' => 'required_if:payment_method,Cheque|nullable|digits:6',
            'cheque_date' => 'required_if:payment_method,Cheque|nullable|date',
            'cheque_account_no' => 'nullable|string',
            'cheque_bank_name' => 'required_if:payment_method,Cheque|nullable|string',
            'cheque_branch' => 'nullable|string',
            
            // Bank deposit fields
            'bank_name' => 'required_if:payment_method,Bank|nullable|string',
            'bank_reference_no' => 'required_if:payment_method,Bank|nullable|string',
            'bank_deposit_date' => 'required_if:payment_method,Bank|nullable|date',
            'bank_account_no' => 'nullable|string',
            'bank_branch' => 'nullable|string',
            
            // Online transfer fields
            'transfer_bank_name' => 'required_if:payment_method,Online Transfer|nullable|string',
            'transfer_transaction_id' => 'required_if:payment_method,Online Transfer|nullable|string',
            'transfer_date' => 'required_if:payment_method,Online Transfer|nullable|date',
            'transfer_reference_no' => 'required_if:payment_method,Online Transfer|nullable|string',
            'transfer_branch' => 'nullable|string',
            
            'notes' => 'nullable|string',
            'invoice_allocations' => 'required|array|min:1',
            'invoice_allocations.*.invoice_id' => 'required|integer',
            'invoice_allocations.*.amount' => 'required|numeric|min:0.01',
        ]);
        
        // ensure key exists even when null
        $validated['selected_bank_id'] = $validated['selected_bank_id'] ?? null;

        Log::info('Supplier payment store', [
            'supplier_id' => $validated['supplier_id'],
            'payment_method' => $validated['payment_method'],
            'paid_amount' => $validated['paid_amount'],
            'selected_bank_id' => $validated['selected_bank_id'],
        ]);

        try {
            DB::beginTransaction();

            /** @var \App\Models\User $user */
            $user = $request->user();

            // Get bank account if provided (for recording purposes, no deduction)
            if (!empty($validated['selected_bank_id'])) {
                $selectedBank = \App\Models\BankAccount::find($validated['selected_bank_id']);
                if (!$selectedBank) {
                    throw new \Exception('Selected bank account not found');
                }
            }

            // Get supplier details
            $supplier = Address::findOrFail($validated['supplier_id']);

            // Generate payment number (thread-safe)
            $paymentNo = SupplierPayment::generatePaymentNo();

            // Create payment record
            $paymentData = [
                'payment_no' => $paymentNo,
                'supplier_id' => $validated['supplier_id'],
                'supplier_code' => $supplier->AdrCd,
                'supplier_name' => trim(($supplier->FstNm ?? '') . ' ' . ($supplier->MidNm ?? '') . ' ' . ($supplier->LstNm ?? '')),
                'supplier_address' => $supplier->Address,
                'supplier_tel' => $supplier->TP1,
                'payment_method' => $validated['payment_method'],

                'paid_amount' => $validated['paid_amount'],
                'payment_date' => $validated['payment_date'],
                'selected_bank_id' => $validated['selected_bank_id'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => 'completed',
                'company_code' => $user->company_code,
                'section_code' => $user->section_code,
                'created_by' => $user->name,
                'created_by_id' => $user->id,
                'invoice_allocations' => $validated['invoice_allocations'] ?? null,
            ];

            // Populate bank details based on payment method and selected bank
            if ($validated['payment_method'] === 'Cheque') {
                $paymentData['cheque_no'] = $validated['cheque_no'];
                $paymentData['cheque_date'] = $validated['cheque_date'];
                // always use values provided by the user for supplier details
                $paymentData['cheque_bank_name'] = $validated['cheque_bank_name'];
                $paymentData['cheque_account_no'] = $validated['cheque_account_no'];
                $paymentData['branch'] = $validated['cheque_branch'];
            } elseif ($validated['payment_method'] === 'Bank') {
                $paymentData['bank_reference_no'] = $validated['bank_reference_no'];
                $paymentData['bank_deposit_date'] = $validated['bank_deposit_date'];
                $paymentData['bank_name'] = $validated['bank_name'];
                $paymentData['bank_account_no'] = $validated['bank_account_no'];
                $paymentData['branch'] = $validated['bank_branch'];
            } elseif ($validated['payment_method'] === 'Online Transfer') {
                $paymentData['transfer_transaction_id'] = $validated['transfer_transaction_id'];
                $paymentData['transfer_date'] = $validated['transfer_date'];
                $paymentData['transfer_reference_no'] = $validated['transfer_reference_no'];
                $paymentData['transfer_bank_name'] = $validated['transfer_bank_name'];
                $paymentData['branch'] = $validated['transfer_branch'];
            }

            $payment = SupplierPayment::create($paymentData);

            // Update invoice balances
            foreach ($validated['invoice_allocations'] as $allocation) {
                $invoice = \App\Models\Purchase::where('PurchaseKey', $allocation['invoice_id'])->first();
                if ($invoice) {
                    $invoice->balance_amount = round((float)$invoice->balance_amount - (float)$allocation['amount'], 2);
                    if ($invoice->balance_amount < 0) {
                        $invoice->balance_amount = 0;
                    }
                    $invoice->save();
                }
            }

            // Create Finance Voucher and update balances
            $supplierName = trim(($supplier->FstNm ?? '') . ' ' . ($supplier->MidNm ?? '') . ' ' . ($supplier->LstNm ?? ''));
            $description = 'Supplier Payment - ' . $paymentNo;

            if ($validated['payment_method'] === 'Cash') {
                $mainCashAccount = \App\Models\FinanceAccount::where('company_code', $user->company_code)
                    ->where('account_type', 'cash')
                    ->lockForUpdate()
                    ->first();
                
                if ($mainCashAccount) {
                    $mainCashAccount->current_balance -= (float) $validated['paid_amount'];
                    $mainCashAccount->save();

                    $voucherData = [
                        'finance_voucher_no' => uniqid('tmp_'),
                        'date' => $validated['payment_date'],
                        'type' => 'withdraw',
                        'finance_account_id' => $mainCashAccount->id,
                        'payer_account' => $supplier->AdrCd . ' - ' . $supplierName,
                        'description' => $description,
                        'amount' => (float) $validated['paid_amount'],
                        'section_code' => $user->section_code,
                        'company_code' => $user->company_code,
                        'created_by_id' => $user->id,
                    ];
                    $voucher = \App\Models\FinanceVoucher::create($voucherData);
                    $voucher->finance_voucher_no = 'FW-' . str_pad($voucher->id, 4, '0', STR_PAD_LEFT);
                    $voucher->save();

                    \App\Models\FinanceAccountTransaction::create([
                        'finance_account_id' => $mainCashAccount->id,
                        'date' => $validated['payment_date'],
                        'source_type' => 'Supplier Payment',
                        'source_id' => $payment->id,
                        'description' => $description,
                        'method' => 'cash',
                        'type' => 'credit', // Credit means Money OUT
                        'amount' => (float) $validated['paid_amount'],
                        'reference' => $voucher->finance_voucher_no,
                    ]);
                    
                    Log::info('Finance Voucher created for cash supplier payment', ['finance_voucher_id' => $voucher->id]);
                } else {
                    Log::warning('Main Cash Account not found for company code ' . $user->company_code);
                }
            } else {
                if (!empty($validated['selected_bank_id'])) {
                    $bankAccount = \App\Models\BankAccount::where('id', $validated['selected_bank_id'])
                        ->lockForUpdate()
                        ->first();

                    if ($bankAccount) {
                        $voucherData = [
                            'finance_voucher_no' => uniqid('tmp_'),
                            'date' => $validated['payment_date'],
                            'type' => 'withdraw',
                            'bank_account_id' => $bankAccount->id,
                            'payer_account' => $supplier->AdrCd . ' - ' . $supplierName,
                            'description' => $description,
                            'amount' => (float) $validated['paid_amount'],
                            'section_code' => $user->section_code,
                            'company_code' => $user->company_code,
                            'created_by_id' => $user->id,
                        ];
                        $voucher = \App\Models\FinanceVoucher::create($voucherData);
                        $voucher->finance_voucher_no = 'FV-' . str_pad($voucher->id, 4, '0', STR_PAD_LEFT);
                        $voucher->save();

                        Log::info('Finance Voucher created for bank supplier payment', ['finance_voucher_id' => $voucher->id]);
                    }
                }
            }

            // Update supplier's current balance with calculated outstanding balance
            $supplierAcc = AccMas::where('AccKy', $supplier->AccKy)->first();
            if ($supplierAcc) {
                // Recalculate the actual outstanding balance
                $this->recalculateSupplierBalance($supplier->AdrKy);

                // Create Accounting Transaction
                \App\Models\AccTrn::create([
                    'AccKy' => $supplierAcc->AccKy,
                    'TrnDt' => $validated['payment_date'],
                    'TrnNo' => $paymentNo,
                    'Amt' => abs((float) $validated['paid_amount']), // Positive for payments made to suppliers (Debit liability decrease)
                    'VaucherNo' => null,
                    'ReferenceNo' => $validated['bank_reference_no'] ?? $validated['transfer_reference_no'] ?? null,
                    'ChqueNo' => $validated['cheque_no'] ?? null,
                    'BankNm' => $validated['cheque_bank_name'] ?? $validated['bank_name'] ?? $validated['transfer_bank_name'] ?? null,
                    'BranchNm' => $validated['cheque_branch'] ?? $validated['bank_branch'] ?? $validated['transfer_branch'] ?? null,
                    'Dec' => $validated['notes'] ?? 'Supplier Payment',
                    'FInAct' => 1,
                    'Status' => 'A',
                    'company_code' => $supplierAcc->company_code ?? null,
                    'section_code' => $supplierAcc->section_code ?? null,
                    'customer_code' => $supplier->AdrCd,
                    'customer_name' => trim(($supplier->FstNm ?? '') . ' ' . ($supplier->MidNm ?? '') . ' ' . ($supplier->LstNm ?? '')),
                ]);
            }

            DB::commit();

            return redirect()->route('admin.supplier-payments.index')->with('success', 'Supplier payment created successfully.')->with('payment_id', $payment->id);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating supplier payment: ' . $e->getMessage());
            Log::error('Trace: ' . $e->getTraceAsString());
            return back()->withErrors(['error' => 'Failed to create payment: ' . $e->getMessage()]);
        }
    }

    /**
     * Helper to recalculate supplier balance consistently
     */
    private function recalculateSupplierBalance($supplierId)
    {
        $supplier = Address::find($supplierId);
        if (!$supplier) return;
        
        $supplierAcc = AccMas::where('AccKy', $supplier->AccKy)->first();
        if (!$supplierAcc) return;

        $companyCode = $supplier->company_code;

        // Total Purchases
        $totalPurchases = DB::table('purchase')
            ->where('company_code', $companyCode)
            ->where(function ($query) use ($supplier) {
                $query->where('SuppCode', $supplier->AdrCd)
                      ->orWhere('AccKy', $supplier->AccKy);
            })
            ->sum('TotalVal');

        // Total Payments
        $totalPayments = SupplierPayment::where('company_code', $companyCode)
            ->where('supplier_code', $supplier->AdrCd)
            ->sum('paid_amount');

        // Total Returns
        $totalReturns = \App\Models\SupplierReturn::where('company_code', $companyCode)
            ->where('supplier_code', $supplier->AdrCd)
            ->where('status', 'approved')
            ->get()
            ->sum(function($ret) {
                return (float)$ret->quantity * (float)$ret->return_value;
            });

        $supplierAcc->CurBal = round($totalPurchases - $totalPayments - $totalReturns, 2);
        $supplierAcc->save();
    }

    /**
     * Generate PDF receipt for supplier payment
     */
    public function generateReceipt(SupplierPayment $supplierPayment)
    {
        if (!request()->user()->hasPermission('supplier_payments.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view supplier payments.');
        }

        $supplierPayment->load('supplier');
        
        $currentBalance = 0;
        $supplierId = $supplierPayment->supplier_id;
        $accKy = null;

        // Resolve AccKy and Supplier ID
        if ($supplierPayment->supplier) {
            $supplierId = $supplierPayment->supplier->AdrKy;
            $accKy = $supplierPayment->supplier->AccKy;
        }

        // Calculate balance consistently with getSupplierDetails method
        if ($supplierPayment->supplier) {
            // Get total purchases for this supplier
            $totalPurchases = DB::table('purchase')
                ->where(function ($query) use ($supplierPayment) {
                    $query->where('SuppCode', $supplierPayment->supplier->AdrCd)
                          ->orWhere('AccKy', $supplierPayment->supplier->AccKy);
                })
                ->sum('TotalVal');

            // Get total payments for this supplier (including this payment)
            $totalPayments = SupplierPayment::where('supplier_code', $supplierPayment->supplier->AdrCd)
                ->sum('paid_amount');

            // Get total returns for this supplier
            $totalReturns = \App\Models\SupplierReturn::where('supplier_code', $supplierPayment->supplier->AdrCd)
                ->where('status', 'approved')
                ->get()
                ->sum(function($ret) {
                    return (float)$ret->quantity * (float)$ret->return_value;
                });

            // Calculate current balance (purchases - payments - returns)
            $currentBalance = $totalPurchases - $totalPayments - $totalReturns;
        }

        // Fetch allocated invoice details if they exist
        $allocatedInvoices = [];
        if (!empty($supplierPayment->invoice_allocations)) {
            foreach ($supplierPayment->invoice_allocations as $allocation) {
                $invoice = DB::table('purchase')
                    ->where('PurchaseKey', $allocation['invoice_id'])
                    ->first();
                if ($invoice) {
                    $allocatedInvoices[] = [
                        'invoice_no' => $invoice->company_code . '-' . sprintf('%06d', $invoice->PurchaseNo),
                        'amount' => $allocation['amount']
                    ];
                }
            }
        }

        $html = $this->generateReceiptHtml($supplierPayment, $currentBalance, $allocatedInvoices);

        // Add auto-print script and auto-close
        $html .= "<script>
            window.onload = function() { 
                window.print(); 
                window.onafterprint = function() { window.close(); };
            }
        </script>";

        return response($html);
    }

    /**
     * Generate HTML for supplier payment receipt
     */
    private function generateReceiptHtml($payment, $balance, $allocatedInvoices = [])
    {
        $companyName = auth()->user()->company->name ?? 'Company Name';
        $companyAddress = auth()->user()->company->address ?? 'Address';
        $companyPhone = auth()->user()->company->phone ?? 'Phone';

        $totalPaid = number_format($payment->paid_amount, 2);
        $balanceFormatted = number_format(abs($balance), 2);
        
        $supplierName = 'N/A';
        if ($payment->supplier) {
            $supplierName = trim($payment->supplier->FstNm . ' ' . $payment->supplier->LstNm);
            if (empty($supplierName) && $payment->supplier->account) {
                 $supplierName = $payment->supplier->account->AccNm;
            }
        }
        
        // Fallback to stored supplier name if no relationship exists
        if ($supplierName === 'N/A' || empty($supplierName)) {
            $supplierName = $payment->supplier_name ?? 'N/A';
        }
        
        $date = $payment->payment_date instanceof \DateTime ? $payment->payment_date->format('Y-m-d H:i') : $payment->payment_date;

        // Fetch company logo and convert to Base64 for Dompdf
        $logoBase64 = '';
        $company = auth()->user()->company ?? \App\Models\Company::first();
        $companyCode = strtoupper($company->company_code ?? 'VIS');
        
        $logoPath = null;
        if (str_contains($companyCode, 'MAL')) {
            $logoPath = public_path('images/malibu-logo.png');
        } else {
            $logoPath = public_path('images/Vismass-logo.png');
        }

        if ($logoPath && file_exists($logoPath)) {
            $type = pathinfo($logoPath, PATHINFO_EXTENSION);
            $data = @file_get_contents($logoPath);
            if ($data) {
                $logoBase64 = 'data:image/' . ($type === 'svg' ? 'svg+xml' : $type) . ';base64,' . base64_encode($data);
            }
        }

        $logoHtml = $logoBase64 ? "<div style='margin-bottom: 5px;'><img src='$logoBase64' style='height: 35px;' /></div>" : " <div class='title'>$companyName</div>";

        return "
        <html>
        <head>
            <style>
                body { font-family: 'Courier New', monospace; font-size: 11px; margin: 0; padding: 5px; }
                .header { text-align: center; margin-bottom: 10px; }
                .title { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
                .details { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                .label { font-weight: bold; }
                .footer { text-align: center; margin-top: 15px; font-size: 10px; }
                .amount-box { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin: 5px 0; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class='header'>
                $logoHtml
                <div>$companyAddress</div>
                <div>Tel: $companyPhone</div>
                <div style='margin-top:5px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px;'>SUPPLIER PAYMENT RECEIPT</div>
            </div>

            <div class='details'>
                <div class='row'>
                    <span class='label'>Date:</span>
                    <span>$date</span>
                </div>
                <div class='row'>
                    <span class='label'>Receipt No:</span>
                    <span>{$payment->payment_no}</span>
                </div>
                <div class='row'>
                    <span class='label'>Supplier:</span>
                    <span>{$supplierName}</span>
                </div>
                <div class='row'>
                    <span class='label'>Code:</span>
                    <span>{$payment->supplier_code}</span>
                </div>
            </div>

            <div class='details'>
                <div class='row'>
                    <span class='label'>Payment Mode:</span>
                    <span style='text-transform: capitalize;'>{$payment->payment_method}</span>
                </div>
                " . ($payment->payment_method == 'Cheque' ? "
                <div class='row'>
                    <span class='label'>Cheque No:</span>
                    <span>{$payment->cheque_no}</span>
                </div>
                " . ($payment->branch ? "
                <div class='row'>
                    <span class='label'>Branch:</span>
                    <span>{$payment->branch}</span>
                </div>" : "") . "
                " : "") . "
                 " . ($payment->payment_method == 'Bank' ? "
                <div class='row'>
                    <span class='label'>Ref No:</span>
                    <span>{$payment->bank_reference_no}</span>
                </div>
                " . ($payment->branch ? "
                <div class='row'>
                    <span class='label'>Branch:</span>
                    <span>{$payment->branch}</span>
                </div>" : "") . "
                " : "") . "
                 " . ($payment->payment_method == 'Online Transfer' ? "
                <div class='row'>
                    <span class='label'>Transaction ID:</span>
                    <span>{$payment->transfer_transaction_id}</span>
                </div>
                " . ($payment->branch ? "
                <div class='row'>
                    <span class='label'>Branch:</span>
                    <span>{$payment->branch}</span>
                </div>" : "") . "
                " : "") . "
            </div>

            <div class='amount-box'>
                <div class='row' style='font-size: 14px;'>
                    <span>AMOUNT PAID:</span>
                    <span>Rs $totalPaid</span>
                </div>
            </div>

            " . (!empty($allocatedInvoices) ? "
            <div style='margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px;'>
                <div style='font-weight: bold; margin-bottom: 5px;'>Invoice Allocations:</div>
                " . implode('', array_map(function($inv) {
                    return "<div class='row'><span>{$inv['invoice_no']}</span><span>Rs " . number_format($inv['amount'], 2) . "</span></div>";
                }, $allocatedInvoices)) . "
            </div>" : "") . "

            <div class='row' style='margin-top: 10px;'>
                <span class='label'>Outstanding Balance:</span>
                <span>Rs $balanceFormatted</span>
            </div>

            <div class='footer'>
                <p>Thank you for your business!</p>
                <p>System Generated Receipt</p>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Display the specified supplier payment
     */
    public function show($id)
    {
        if (!request()->user()->hasPermission('supplier_payments.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view supplier payments.');
        }

        $payment = SupplierPayment::with(['supplier', 'bankAccount'])->findOrFail($id);

        $allocatedInvoices = [];
        if (!empty($payment->invoice_allocations)) {
            foreach ($payment->invoice_allocations as $allocation) {
                $invoice = DB::table('purchase')
                    ->where('PurchaseKey', $allocation['invoice_id'])
                    ->first();
                if ($invoice) {
                    $allocatedInvoices[] = [
                        'invoice_id' => $allocation['invoice_id'],
                        'invoice_no' => $invoice->company_code . '-' . sprintf('%06d', $invoice->PurchaseNo),
                        'supplier_invoice_no' => $invoice->SuppInvNo,
                        'amount' => $allocation['amount']
                    ];
                }
            }
        }

        return Inertia::render('admin/supplier-payments/show', [
            'payment' => [
                'id' => $payment->id,
                'payment_no' => $payment->payment_no,
                'supplier_id' => $payment->supplier_id,
                'supplier_code' => $payment->supplier_code,
                'supplier_name' => $payment->supplier_name,
                'supplier_address' => $payment->supplier_address,
                'supplier_tel' => $payment->supplier_tel,
                'payment_method' => $payment->payment_method,
                'paid_amount' => $payment->paid_amount,
                'payment_date' => $payment->payment_date?->format('Y-m-d'),
                'cheque_no' => $payment->cheque_no,
                'cheque_date' => $payment->cheque_date?->format('Y-m-d'),
                'cheque_account_no' => $payment->cheque_account_no,
                'cheque_bank_name' => $payment->cheque_bank_name,
                'branch' => $payment->branch,
                'bank_name' => $payment->bank_name,
                'bank_reference_no' => $payment->bank_reference_no,
                'bank_deposit_date' => $payment->bank_deposit_date?->format('Y-m-d'),
                'bank_account_no' => $payment->bank_account_no,
                'transfer_bank_name' => $payment->transfer_bank_name,
                'transfer_transaction_id' => $payment->transfer_transaction_id,
                'transfer_date' => $payment->transfer_date?->format('Y-m-d'),
                'transfer_reference_no' => $payment->transfer_reference_no,
                'notes' => $payment->notes,
                'status' => $payment->status,
                'company_code' => $payment->company_code,
                'section_code' => $payment->section_code,
                'created_by' => $payment->created_by,
                'created_by_id' => $payment->created_by_id,
                'created_at' => $payment->created_at?->format('Y-m-d H:i:s'),
                'updated_at' => $payment->updated_at?->format('Y-m-d H:i:s'),
                'bank_account' => $payment->bankAccount ? [
                    'account_name' => $payment->bankAccount->account_name,
                    'account_number' => $payment->bankAccount->account_number,
                    'bank_name' => $payment->bankAccount->bank_name,
                    'branch_name' => $payment->bankAccount->branch_name,
                    'current_balance' => $payment->bankAccount->current_balance,
                ] : null,
                'invoice_allocations' => $allocatedInvoices,
            ],
        ]);
    }

    /**
     * Show the form for editing the specified supplier payment
     */
    public function edit($id)
    {
        if (!request()->user()->hasPermission('supplier_payments.edit')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit supplier payments.');
        }

        /** @var \App\Models\User $user */
        $user = request()->user();
        
        $payment = SupplierPayment::findOrFail($id);

        // Get suppliers based on user role
        $suppliersQuery = Address::select('address.AdrKy', 'address.AdrCd', 'address.FstNm', 'address.LstNm', 'address.Address', 'address.TP1', 'address.AccKy')
            ->join('acc_mas', 'address.AccKy', '=', 'acc_mas.AccKy')
            ->where('address.AdrTypKy', 4) // 4 = Supplier type
            ->where('acc_mas.AccTyp', 'SUPPLIER')
            ->whereNotNull('address.AccKy');

        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) { // Branch level
                $suppliersQuery->where('address.section_code', $user->section_code);
            } else { // Company level
                $suppliersQuery->where('address.company_code', $user->company_code);
            }
        }

        $suppliers = $suppliersQuery->orderBy('address.AdrCd')->get();

        return Inertia::render('admin/supplier-payments/edit', [
            'payment' => $payment,
            'suppliers' => $suppliers,
        ]);
    }

    /**
     * Update the specified supplier payment
     */
    public function update(Request $request, $id)
    {
        if (!request()->user()->hasPermission('supplier_payments.edit')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit supplier payments.');
        }

        $payment = SupplierPayment::findOrFail($id);

        $validated = $request->validate([
            'supplier_id' => 'required|exists:address,AdrKy',
            'payment_method' => 'required|in:Cash,Cheque,Bank,Online Transfer',
            'paid_amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            
            // Cheque fields
            'cheque_no' => 'required_if:payment_method,Cheque|nullable|string',
            'cheque_date' => 'required_if:payment_method,Cheque|nullable|date',
            'cheque_account_no' => 'nullable|string',
            'cheque_bank_name' => 'required_if:payment_method,Cheque|nullable|string',
            'cheque_branch' => 'nullable|string',
            
            // Bank deposit fields
            'bank_name' => 'required_if:payment_method,Bank|nullable|string',
            'bank_reference_no' => 'required_if:payment_method,Bank|nullable|string',
            'bank_deposit_date' => 'required_if:payment_method,Bank|nullable|date',
            'bank_account_no' => 'nullable|string',
            'bank_branch' => 'nullable|string',
            
            // Online transfer fields
            'transfer_bank_name' => 'required_if:payment_method,Online Transfer|nullable|string',
            'transfer_transaction_id' => 'required_if:payment_method,Online Transfer|nullable|string',
            'transfer_date' => 'required_if:payment_method,Online Transfer|nullable|date',
            'transfer_reference_no' => 'required_if:payment_method,Online Transfer|nullable|string',
            'transfer_branch' => 'nullable|string',
            
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            // If amount changed, it affects invoice allocations and ledger consistency.
            // For accounting integrity, we restrict amount changes via edit.
            if (round((float)$payment->paid_amount, 2) != round((float)$validated['paid_amount'], 2)) {
                return back()->withErrors(['paid_amount' => 'Payment amount cannot be edited to maintain accounting integrity. Please delete and recreate the payment if the amount is incorrect.'])->withInput();
            }

            // Get supplier details
            $supplier = Address::findOrFail($validated['supplier_id']);

            // Update payment record
            $payment->update([
                'supplier_id' => $validated['supplier_id'],
                'supplier_code' => $supplier->AdrCd,
                'supplier_name' => trim(($supplier->FstNm ?? '') . ' ' . ($supplier->MidNm ?? '') . ' ' . ($supplier->LstNm ?? '')),
                'supplier_address' => $supplier->Address,
                'supplier_tel' => $supplier->TP1,
                'payment_method' => $validated['payment_method'],

                'payment_date' => $validated['payment_date'],
                'cheque_no' => $validated['cheque_no'] ?? null,
                'cheque_date' => $validated['cheque_date'] ?? null,
                'cheque_account_no' => $validated['cheque_account_no'] ?? null,
                'cheque_bank_name' => $validated['cheque_bank_name'] ?? null,
                'branch' => $validated['cheque_branch'] ?? $validated['bank_branch'] ?? $validated['transfer_branch'] ?? null,
                'bank_name' => $validated['bank_name'] ?? null,
                'bank_reference_no' => $validated['bank_reference_no'] ?? null,
                'bank_deposit_date' => $validated['bank_deposit_date'] ?? null,
                'bank_account_no' => $validated['bank_account_no'] ?? null,
                'transfer_bank_name' => $validated['transfer_bank_name'] ?? null,
                'transfer_transaction_id' => $validated['transfer_transaction_id'] ?? null,
                'transfer_date' => $validated['transfer_date'] ?? null,
                'transfer_reference_no' => $validated['transfer_reference_no'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Sync changes to the Accounting Transaction
            \App\Models\AccTrn::where('TrnNo', $payment->payment_no)->update([
                'TrnDt' => $validated['payment_date'],
                'ReferenceNo' => $validated['bank_reference_no'] ?? $validated['transfer_reference_no'] ?? null,
                'ChqueNo' => $validated['cheque_no'] ?? null,
                'BankNm' => $validated['cheque_bank_name'] ?? $validated['bank_name'] ?? $validated['transfer_bank_name'] ?? null,
                'BranchNm' => $validated['cheque_branch'] ?? $validated['bank_branch'] ?? $validated['transfer_branch'] ?? null,
                'Dec' => $validated['notes'] ?? 'Supplier Payment (Updated)',
            ]);

            DB::commit();

            return redirect()->route('admin.supplier-payments.show', $payment->id)
                ->with('success', 'Supplier payment updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating supplier payment: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to update payment: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Remove the specified supplier payment
     */
    public function destroy($id)
    {
        if (!request()->user()->hasPermission('supplier_payments.delete')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete supplier payments.');
        }

        try {
            DB::beginTransaction();

            $payment = SupplierPayment::findOrFail($id);
            $supplierId = $payment->supplier_id;
            $paymentNo = $payment->payment_no;

            // 1. Restore invoice balances
            if (!empty($payment->invoice_allocations)) {
                foreach ($payment->invoice_allocations as $allocation) {
                    $invoice = \App\Models\Purchase::where('PurchaseKey', $allocation['invoice_id'])->first();
                    if ($invoice) {
                        $invoice->balance_amount = round((float)$invoice->balance_amount + (float)$allocation['amount'], 2);
                        $invoice->save();
                    }
                }
            }

            // 2. Delete associated Accounting Transactions
            \App\Models\AccTrn::where('TrnNo', $paymentNo)->delete();

            // 3. Delete the payment record
            $payment->delete();

            // 4. Recalculate supplier balance
            $this->recalculateSupplierBalance($supplierId);

            DB::commit();

            return redirect()->route('admin.supplier-payments.index')
                ->with('success', 'Supplier payment deleted successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting supplier payment: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to delete payment: ' . $e->getMessage()]);
        }
    }
}
