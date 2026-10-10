<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use App\Models\BankAccount;
use App\Models\FinanceAccount;
use App\Models\FinanceAccountTransaction;
use App\Models\FinanceVoucher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FinanceTransferController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('cashier.shift', only: ['index', 'create', 'store']),
        ];
    }
    public function index(Request $request)
    {
        if (! request()->user()->hasPermission('finance_transfers.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $query = FinanceVoucher::with(['financeAccount', 'bankAccount', 'toFinanceAccount', 'toBankAccount', 'expenseAccount', 'toExpenseAccount', 'pettyCashCategory', 'toPettyCashCategory', 'deliveryPettyCashCategory', 'toDeliveryPettyCashCategory'])->orderBy('date', 'desc')->orderBy('id', 'desc');

        if ($request->search) {
            $query->where('finance_voucher_no', 'like', "%{$request->search}%")
                ->orWhere('payer_account', 'like', "%{$request->search}%")
                ->orWhere('description', 'like', "%{$request->search}%");
        }

        if ($user = $request->user()) {
            if ($user->role_id !== 1) {
                if ($user->role_id === 3) {
                    $query->where('section_code', $user->section_code);
                } else {
                    $query->where('company_code', $user->company_code);
                }
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        $perPage = $request->input('per_page', 15);
        $vouchers = $query->paginate($perPage)->withQueryString();

        return Inertia::render('admin/FinanceTransfers/Index', [
            'Transfers' => $vouchers,
            'filters' => $request->only(['search', 'per_page', 'date_from', 'date_to']),
        ]);
    }

    public function exportCsv(Request $request)
    {
        if (! request()->user()->hasPermission('finance_transfers.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $query = FinanceVoucher::with(['financeAccount', 'bankAccount', 'toFinanceAccount', 'toBankAccount', 'expenseAccount', 'toExpenseAccount', 'pettyCashCategory', 'toPettyCashCategory', 'deliveryPettyCashCategory', 'toDeliveryPettyCashCategory'])->orderBy('date', 'desc')->orderBy('id', 'desc');

        if ($request->search) {
            $query->where('finance_voucher_no', 'like', "%{$request->search}%")
                ->orWhere('payer_account', 'like', "%{$request->search}%")
                ->orWhere('description', 'like', "%{$request->search}%");
        }

        if ($user = $request->user()) {
            if ($user->role_id !== 1) {
                if ($user->role_id === 3) {
                    $query->where('section_code', $user->section_code);
                } else {
                    $query->where('company_code', $user->company_code);
                }
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        $vouchers = $query->get();

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=finance_transfers.csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['Transaction No.', 'Type', 'Date', 'From Account', 'To Account', 'Amount'];

        $callback = function() use($vouchers, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($vouchers as $voucher) {
                $fromAcc = '-';
                if ($voucher->financeAccount) $fromAcc = $voucher->financeAccount->account_name . ' (Finance)';
                elseif ($voucher->bankAccount) $fromAcc = $voucher->bankAccount->account_name . ' (Bank)';

                $toAcc = '-';
                if ($voucher->toFinanceAccount) $toAcc = $voucher->toFinanceAccount->account_name . ' (Finance)';
                elseif ($voucher->toBankAccount) $toAcc = $voucher->toBankAccount->account_name . ' (Bank)';

                fputcsv($file, [
                    $voucher->finance_voucher_no,
                    ucfirst($voucher->type),
                    $voucher->date,
                    $fromAcc,
                    $toAcc,
                    $voucher->amount,
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function create(Request $request)
    {
        if (! request()->user()->hasPermission('finance_transfers.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }
        $accountsQuery = FinanceAccount::where('status', 1);
        $banksQuery = BankAccount::where('status', 1);
        $expensesQuery = \App\Models\ExpenseAccount::where('status', 1);
        $payersQuery = FinanceVoucher::select('payer_account')->distinct();
        $descriptionsQuery = FinanceVoucher::select('description')->whereNotNull('description')->where('description', '!=', '')->distinct();

        if ($user = $request->user()) {
            if ($user->role_id !== 1) {
                if ($user->role_id === 3) {
                    $accountsQuery->where('section_code', $user->section_code);
                    $banksQuery->where('section_code', $user->section_code);
                    $expensesQuery->where('section_code', $user->section_code);
                    $payersQuery->where('section_code', $user->section_code);
                    $descriptionsQuery->where('section_code', $user->section_code);
                } else {
                    $accountsQuery->where('company_code', $user->company_code);
                    $banksQuery->where('company_code', $user->company_code);
                    $expensesQuery->where('company_code', $user->company_code);
                    $payersQuery->where('company_code', $user->company_code);
                    $descriptionsQuery->where('company_code', $user->company_code);
                }
            }
        }

        $financeAccounts = $accountsQuery->get();
        $bankAccounts = $banksQuery->get();
        $expenseAccounts = $expensesQuery->get();
        $payerAccounts = $payersQuery->pluck('payer_account');
        $descriptions = $descriptionsQuery->pluck('description')->reject(function ($desc) {
            return preg_match('/^(R|INV|RET|REC|PR|PO|DO)-[A-Z0-9]+-/i', $desc);
        })->values();

        $latestVoucher = FinanceVoucher::where('finance_voucher_no', 'like', 'FV-%')->latest('id')->first();
        $lastNo = $latestVoucher ? intval(preg_replace('/[^0-9]/', '', $latestVoucher->finance_voucher_no)) : 0;
        $nextVoucherNo = 'FV-' . str_pad($lastNo + 1, 4, '0', STR_PAD_LEFT);

        return Inertia::render('admin/FinanceTransfers/Create', [
            'next_voucher_no' => $nextVoucherNo,
            'finance_accounts' => $financeAccounts,
            'bank_accounts' => $bankAccounts,
            'expense_accounts' => $expenseAccounts,
            'payer_accounts' => $payerAccounts,
            'descriptions' => $descriptions,
        ]);
    }

    public function store(Request $request)
    {
        if (! request()->user()->hasPermission('finance_transfers.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }
        $data = $request->validate([
            'date' => 'required|date',
            'type' => 'required|in:transfer,deposit,withdraw',
            'selected_account' => 'required|string',
            'destination_account' => 'nullable|string',
            'payer_account' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,cheque,online',
            'cheque_number' => 'required_if:payment_method,cheque|nullable|string|digits:6',
            'cheque_date' => 'required_if:payment_method,cheque|nullable|date',
            'reference_number' => 'required_if:payment_method,online|nullable|string|max:255',
            'slip' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
        ]);

        $parts = explode('_', $data['selected_account']);
        if (count($parts) === 2) {
            $accType = $parts[0];
            $accId = $parts[1];

            // Balance Validation for Withdrawals and Transfers
            if (in_array($data['type'], ['withdraw', 'transfer'])) {
                $currentBalance = 0;
                $accountName = '';
                
                if ($accType === 'finance') {
                    $acc = FinanceAccount::find($accId);
                    $currentBalance = $acc ? (float)$acc->current_balance : 0;
                    $accountName = $acc ? $acc->account_name : 'Selected Account';
                } elseif ($accType === 'bank') {
                    $acc = BankAccount::find($accId);
                    $currentBalance = $acc ? (float)$acc->current_balance : 0;
                    $accountName = $acc ? $acc->bank_name . ' - ' . $acc->account_name : 'Selected Account';
                } elseif ($accType === 'expense') {
                    $acc = \App\Models\ExpenseAccount::find($accId);
                    $currentBalance = $acc ? (float)$acc->current_balance : 0;
                    $accountName = $acc ? $acc->account_name : 'Selected Account';
                } elseif ($accType === 'pettycash') {
                    $acc = \App\Models\PettyCashCategory::find($accId);
                    $currentBalance = $acc ? (float)$acc->current_balance : 0;
                    $accountName = $acc ? $acc->name : 'Selected Account';
                } elseif ($accType === 'deliverypettycash') {
                    $acc = \App\Models\DeliveryPettyCashCategory::find($accId);
                    $currentBalance = $acc ? (float)$acc->current_balance : 0;
                    $accountName = $acc ? $acc->name : 'Selected Account';
                }
                
                if ((float)$data['amount'] > $currentBalance) {
                    return redirect()->back()->withErrors([
                        'amount' => "Insufficient funds in {$accountName}. Available balance: Rs. " . number_format($currentBalance, 2)
                    ])->withInput();
                }
            }

            if ($accType === 'finance') {
                $data['finance_account_id'] = $accId;
            } elseif ($accType === 'bank') {
                $data['bank_account_id'] = $accId;
            } elseif ($accType === 'expense') {
                $data['expense_account_id'] = $accId;
            } elseif ($accType === 'pettycash') {
                $data['petty_cash_category_id'] = $accId;
            } elseif ($accType === 'deliverypettycash') {
                $data['delivery_petty_cash_category_id'] = $accId;
            } else {
                return redirect()->back()->withErrors(['selected_account' => 'Invalid account selected']);
            }
        } else {
            return redirect()->back()->withErrors(['selected_account' => 'Invalid account selected']);
        }
        unset($data['selected_account']);

        if ($data['type'] === 'transfer') {
            $data['payer_account'] = 'Internal Transfer';
        } elseif (empty($data['payer_account'])) {
            $data['payer_account'] = '-';
        }

        if (in_array($data['type'], ['transfer', 'withdraw']) && !empty($data['destination_account'])) {
            $destParts = explode('_', $data['destination_account']);
            if (count($destParts) === 2) {
                $destType = $destParts[0];
                $destId = $destParts[1];
                if ($destType === 'finance') {
                    $data['to_finance_account_id'] = $destId;
                } elseif ($destType === 'bank') {
                    $data['to_bank_account_id'] = $destId;
                } elseif ($destType === 'expense') {
                    $data['to_expense_account_id'] = $destId;
                } elseif ($destType === 'pettycash') {
                    $data['to_petty_cash_category_id'] = $destId;
                } elseif ($destType === 'deliverypettycash') {
                    $data['to_delivery_petty_cash_category_id'] = $destId;
                } else {
                    return redirect()->back()->withErrors(['destination_account' => 'Invalid destination account']);
                }
            } else {
                return redirect()->back()->withErrors(['destination_account' => 'Invalid destination account']);
            }
        }
        unset($data['destination_account']);

        if ($request->hasFile('slip')) {
            $data['slip_path'] = $request->file('slip')->store('finance_voucher_slips', 'public');
        }
        unset($data['slip']);

        if ($user = $request->user()) {
            $data['company_code'] = $user->company_code;
            $data['section_code'] = $user->section_code;
            $data['created_by_id'] = $user->id;
        }

        $createdVoucherId = null;

        DB::transaction(function () use (&$data, &$createdVoucherId) {
            $data['finance_voucher_no'] = uniqid('tmp_');
            $voucher = FinanceVoucher::create($data);
            $latest = FinanceVoucher::where('id', '!=', $voucher->id)
                ->where('finance_voucher_no', 'like', 'FV-%')
                ->latest('id')
                ->first();
            $lastNo = 0;
            if ($latest) {
                $lastNo = intval(preg_replace('/[^0-9]/', '', $latest->finance_voucher_no));
            }
            $prefix = 'FV-';
            $voucher->finance_voucher_no = $prefix . str_pad($lastNo + 1, 4, '0', STR_PAD_LEFT);
            $voucher->save();
            $createdVoucherId = $voucher->id;

            // Process Source Account
            if (isset($data['finance_account_id'])) {
                $financeAccount = FinanceAccount::where('id', $data['finance_account_id'])
                    ->lockForUpdate()
                    ->first();

                if ($financeAccount) {
                    if ($voucher->type === 'deposit') {
                        $financeAccount->current_balance += (float) $voucher->amount;
                    } else {
                        $financeAccount->current_balance -= (float) $voucher->amount;
                    }
                    $financeAccount->save();

                    FinanceAccountTransaction::create([
                        'finance_account_id' => $financeAccount->id,
                        'date' => $voucher->date,
                        'source_type' => 'Finance Transfer',
                        'source_id' => $voucher->id,
                        'description' => ($voucher->description ?? ($voucher->type === 'transfer' ? 'Internal Transfer Out' : 'Finance Voucher ' . ucfirst($voucher->type) . ' - ' . $voucher->payer_account)) . ' - ' . $voucher->finance_voucher_no,
                        'method' => $financeAccount->account_type, 
                        'type' => $voucher->type === 'deposit' ? 'debit' : 'credit', // withdrawal/transfer-out = credit, deposit = debit
                        'amount' => (float) $voucher->amount,
                        'reference' => $voucher->finance_voucher_no,
                    ]);
                }
            } elseif (isset($data['bank_account_id'])) {
                $bankAccount = BankAccount::where('id', $data['bank_account_id'])
                    ->lockForUpdate()
                    ->first();
                if ($bankAccount) {
                    if ($voucher->type === 'deposit') {
                        $bankAccount->current_balance += (float) $voucher->amount;
                    } else {
                        $bankAccount->current_balance -= (float) $voucher->amount;
                    }
                    $bankAccount->save();

                    FinanceAccountTransaction::create([
                        'bank_account_id' => $bankAccount->id,
                        'date' => $voucher->date,
                        'source_type' => 'Finance Transfer',
                        'source_id' => $voucher->id,
                        'description' => ($voucher->description ?? ($voucher->type === 'transfer' ? 'Internal Transfer Out' : 'Finance Voucher ' . ucfirst($voucher->type) . ' - ' . $voucher->payer_account)) . ' - ' . $voucher->finance_voucher_no,
                        'method' => 'bank',
                        'type' => $voucher->type === 'deposit' ? 'debit' : 'credit', // withdrawal/transfer-out = credit, deposit = debit
                        'amount' => (float) $voucher->amount,
                        'reference' => $voucher->finance_voucher_no,
                    ]);
                }
            } elseif (isset($data['expense_account_id'])) {
                $expenseAccount = \App\Models\ExpenseAccount::where('id', $data['expense_account_id'])->lockForUpdate()->first();
                if ($expenseAccount) {
                    if ($voucher->type === 'deposit') {
                        $expenseAccount->current_balance += (float) $voucher->amount;
                    } else {
                        $expenseAccount->current_balance -= (float) $voucher->amount;
                    }
                    $expenseAccount->save();
                }
            } elseif (isset($data['petty_cash_category_id'])) {
                $pettyCashAccount = \App\Models\PettyCashCategory::where('id', $data['petty_cash_category_id'])->lockForUpdate()->first();
                if ($pettyCashAccount) {
                    if ($voucher->type === 'deposit') {
                        $pettyCashAccount->current_balance += (float) $voucher->amount;
                    } else {
                        $pettyCashAccount->current_balance -= (float) $voucher->amount;
                    }
                    $pettyCashAccount->save();
                }
            } elseif (isset($data['delivery_petty_cash_category_id'])) {
                $deliveryPettyCashAccount = \App\Models\DeliveryPettyCashCategory::where('id', $data['delivery_petty_cash_category_id'])->lockForUpdate()->first();
                if ($deliveryPettyCashAccount) {
                    if ($voucher->type === 'deposit') {
                        $deliveryPettyCashAccount->current_balance += (float) $voucher->amount;
                    } else {
                        $deliveryPettyCashAccount->current_balance -= (float) $voucher->amount;
                    }
                    $deliveryPettyCashAccount->save();
                }
            }

            // Process Destination Account for Transfers and Withdrawals (Expenses)
            if (in_array($voucher->type, ['transfer', 'withdraw'])) {
                if (isset($data['to_finance_account_id'])) {
                    $financeAccount = FinanceAccount::where('id', $data['to_finance_account_id'])
                        ->lockForUpdate()
                        ->first();
                    if ($financeAccount) {
                        $financeAccount->current_balance += (float) $voucher->amount;
                        $financeAccount->save();

                        FinanceAccountTransaction::create([
                            'finance_account_id' => $financeAccount->id,
                            'date' => $voucher->date,
                            'source_type' => 'Finance Transfer',
                            'source_id' => $voucher->id,
                            'description' => ($voucher->description ?? 'Internal Transfer In') . ' - ' . $voucher->finance_voucher_no,
                            'method' => $financeAccount->account_type, 
                            'type' => 'debit', // Inward is debit
                            'amount' => (float) $voucher->amount,
                            'reference' => $voucher->finance_voucher_no,
                        ]);
                    }
                } elseif (isset($data['to_bank_account_id'])) {
                    $bankAccount = BankAccount::where('id', $data['to_bank_account_id'])
                        ->lockForUpdate()
                        ->first();
                    if ($bankAccount) {
                        $bankAccount->current_balance += (float) $voucher->amount;
                        $bankAccount->save();

                        FinanceAccountTransaction::create([
                            'bank_account_id' => $bankAccount->id,
                            'date' => $voucher->date,
                            'source_type' => 'Finance Transfer',
                            'source_id' => $voucher->id,
                            'description' => ($voucher->description ?? 'Internal Transfer In') . ' - ' . $voucher->finance_voucher_no,
                            'method' => 'bank',
                            'type' => 'debit', // Inward is debit
                            'amount' => (float) $voucher->amount,
                            'reference' => $voucher->finance_voucher_no,
                        ]);
                    }
                } elseif (isset($data['to_expense_account_id'])) {
                    $expenseAccount = \App\Models\ExpenseAccount::where('id', $data['to_expense_account_id'])->lockForUpdate()->first();
                    if ($expenseAccount) {
                        $expenseAccount->current_balance += (float) $voucher->amount;
                        $expenseAccount->save();
                    }
                } elseif (isset($data['to_petty_cash_category_id'])) {
                    $pettyCashAccount = \App\Models\PettyCashCategory::where('id', $data['to_petty_cash_category_id'])->lockForUpdate()->first();
                    if ($pettyCashAccount) {
                        $pettyCashAccount->current_balance += (float) $voucher->amount;
                        $pettyCashAccount->save();
                    }
                } elseif (isset($data['to_delivery_petty_cash_category_id'])) {
                    $deliveryPettyCashAccount = \App\Models\DeliveryPettyCashCategory::where('id', $data['to_delivery_petty_cash_category_id'])->lockForUpdate()->first();
                    if ($deliveryPettyCashAccount) {
                        $deliveryPettyCashAccount->current_balance += (float) $voucher->amount;
                        $deliveryPettyCashAccount->save();
                    }
                }
            }
        });

        return redirect()->route('admin.finance-transfers.receipt', $createdVoucherId);
    }

    public function show(Request $request, $id)
    {
        if (! request()->user()->hasPermission('finance_transfers.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $voucher = FinanceVoucher::with(['financeAccount', 'bankAccount', 'toFinanceAccount', 'toBankAccount', 'expenseAccount', 'toExpenseAccount', 'pettyCashCategory', 'toPettyCashCategory', 'deliveryPettyCashCategory', 'toDeliveryPettyCashCategory', 'createdBy'])->findOrFail($id);

        if ($user = $request->user()) {
            if ($user->role_id !== 1) {
                if ($user->role_id === 3 && $voucher->section_code !== $user->section_code) {
                    abort(403);
                } elseif ($user->role_id === 2 && $voucher->company_code !== $user->company_code) {
                    abort(403);
                }
            }
        }

        return Inertia::render('admin/FinanceTransfers/Show', [
            'Transfer' => $voucher,
        ]);
    }

    public function generateReceipt($id)
    {
        $voucher = FinanceVoucher::with(['financeAccount', 'bankAccount', 'toFinanceAccount', 'toBankAccount', 'expenseAccount', 'toExpenseAccount', 'pettyCashCategory', 'toPettyCashCategory', 'deliveryPettyCashCategory', 'toDeliveryPettyCashCategory', 'createdBy'])->findOrFail($id);

        // Resolve from account name
        $fromAccountName = '-';
        if ($voucher->financeAccount) {
            $fromAccountName = $voucher->financeAccount->account_name . ' (Finance)';
        } elseif ($voucher->bankAccount) {
            $fromAccountName = $voucher->bankAccount->bank_name . ' - ' . $voucher->bankAccount->account_name;
        } elseif ($voucher->expenseAccount) {
            $fromAccountName = $voucher->expenseAccount->account_name . ' (Expense)';
        } elseif ($voucher->pettyCashCategory) {
            $fromAccountName = $voucher->pettyCashCategory->name . ' (Petty Cash)';
        } elseif ($voucher->deliveryPettyCashCategory) {
            $fromAccountName = $voucher->deliveryPettyCashCategory->name . ' (Delivery Petty Cash)';
        }

        // Resolve to account name
        $toAccountName = null;
        if ($voucher->toFinanceAccount) {
            $toAccountName = $voucher->toFinanceAccount->account_name . ' (Finance)';
        } elseif ($voucher->toBankAccount) {
            $toAccountName = $voucher->toBankAccount->bank_name . ' - ' . $voucher->toBankAccount->account_name;
        } elseif ($voucher->toExpenseAccount) {
            $toAccountName = $voucher->toExpenseAccount->account_name . ' (Expense)';
        } elseif ($voucher->toPettyCashCategory) {
            $toAccountName = $voucher->toPettyCashCategory->name . ' (Petty Cash)';
        } elseif ($voucher->toDeliveryPettyCashCategory) {
            $toAccountName = $voucher->toDeliveryPettyCashCategory->name . ' (Delivery Petty Cash)';
        }

        // Company info
        $user = auth()->user();
        $company = ($user && $user->company) ? $user->company : \App\Models\Company::first();
        $companyName = $company->name ?? 'Company Name';
        $companyAddress = $company->address ?? 'Address';
        $companyPhone = $company->phone ?? 'Phone';

        // Logo
        $logoBase64 = '';
        $companyCode = strtoupper($company->company_code ?? 'VIS');
        
        $vismassPngCandidates = [public_path('images/Vismass-logo.png'), public_path('images/vismass-logo.png')];
        $malibuPngCandidates = [public_path('images/Malibu-logo.png'), public_path('images/malibu-logo.png')];

        $logoPath = null;
        if (str_contains($companyCode, 'MAL')) {
            foreach ($malibuPngCandidates as $c) { if (file_exists($c)) { $logoPath = $c; break; } }
        } else {
            foreach ($vismassPngCandidates as $c) { if (file_exists($c)) { $logoPath = $c; break; } }
        }

        if ($logoPath && file_exists($logoPath)) {
            $type = pathinfo($logoPath, PATHINFO_EXTENSION);
            $data = @file_get_contents($logoPath);
            if ($data) {
                $logoBase64 = 'data:image/' . ($type === 'svg' ? 'svg+xml' : $type) . ';base64,' . base64_encode($data);
            }
        }

        $html = view('finance_vouchers.receipt', [
            'voucher' => $voucher,
            'fromAccountName' => $fromAccountName,
            'toAccountName' => $toAccountName,
            'logoBase64' => $logoBase64,
            'companyName' => $companyName,
            'companyAddress' => $companyAddress,
            'companyPhone' => $companyPhone,
        ])->render();

        return response($html)
            ->header('Content-Type', 'text/html');
    }
}
