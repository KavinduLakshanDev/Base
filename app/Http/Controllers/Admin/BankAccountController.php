<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Company;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BankAccountController extends Controller
{
    /**
     * Display a listing of bank accounts.
     */
    public function index(Request $request)
    {
        if (! request()->user()->hasPermission('bank_accounts.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $query = BankAccount::with(['creator', 'company', 'section']);

        // Filter by company/section for non-superadmin users
        $user = Auth::guard('web')->user() ?? Auth::guard('company')->user();
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) { // Branch/Section admin - filter by their section
                $query->where('section_code', $user->section_code);
            } else { // Company admin - filter by their company
                $query->where('company_code', $user->company_code);
            }
        }

        // Apply filters
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('account_name', 'like', "%{$search}%")
                  ->orWhere('account_number', 'like', "%{$search}%")
                  ->orWhere('bank_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('company_code')) {
            $query->where('company_code', $request->company_code);
        }

        if ($request->filled('section_code')) {
            $query->where('section_code', $request->section_code);
        }

        $bankAccounts = $query->latest()->paginate(15);

        // Get available companies and sections based on user role
        $user = $request->user();
        $companies = collect();
        $sections = collect();

        if ($user) {
            if ($user->role_id === 1) { // Superadmin - all companies and sections
                $companies = Company::all();
                $sections = Section::all();
            } elseif ($user->role_id === 2) { // Company admin - their company and its sections
                $companies = Company::where('company_code', $user->company_code)->get();
                $sections = Section::where('company_code', $user->company_code)->get();
            } elseif ($user->role_id === 3) { // Section admin - their company and section
                $companies = Company::where('company_code', $user->company_code)->get();
                $userSection = Section::where('section_code', $user->section_code)->first();
                if ($userSection) {
                    $sections = collect([$userSection]);
                }
            }
        }

        return Inertia::render('admin/bank-accounts/index', [
            'bankAccounts' => $bankAccounts,
            'filters' => $request->only(['search', 'status', 'company_code', 'section_code']),
            'companies' => $companies->map(function ($company) {
                return [
                    'value' => $company->company_code,
                    'label' => $company->company_name,
                ];
            }),
            'branches' => $sections->map(function ($section) {
                return [
                    'value' => $section->section_code,
                    'label' => $section->name,
                ];
            }),
        ]);
    }

    /**
     * Show the form for creating a new bank account.
     */
    public function create(): Response
    {
        if (! request()->user()->hasPermission('bank_accounts.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }
        return Inertia::render('admin/bank-accounts/create');
    }

    public function store(Request $request): RedirectResponse
    {
        if (! request()->user()->hasPermission('bank_accounts.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $validated = $request->validate([
            'account_name' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:50', 'unique:bank_accounts'],
            'bank_name' => ['required', 'string', 'max:255'],
            'branch_name' => ['required', 'string', 'max:255'],
            'account_type' => ['required', 'in:savings,current,checking'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'status' => ['required', 'in:active,inactive,closed'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        // Ensure opening_balance has a default value
        $validated['opening_balance'] = $validated['opening_balance'] ?? 0;

        // Convert empty string to 0 for opening_balance
        if ($validated['opening_balance'] === '') {
            $validated['opening_balance'] = 0;
        }

        try {
            DB::beginTransaction();

            // Get the authenticated user from either web or company guard
            $user = Auth::guard('web')->user() ?? Auth::guard('company')->user();

            // Debug: Check authentication
            if (!$user) {
                throw new \Exception('User not authenticated.');
            }

            // Determine company and section based on user role
            $companyCode = $user->company_code;
            $sectionCode = $user->section_code;

            if ($user->role_id === 1) { // Super admin
                // For super admin, use their company/section if set, otherwise default
                if (!$companyCode || !$sectionCode) {
                    // Default to main section of first company
                    $section = Section::where('is_active', true)
                        ->orderBy('is_main_stock', 'desc')
                        ->first();

                    if (!$section) {
                        throw new \Exception('No valid sections found in the system.');
                    }
                    $companyCode = $section->company_code;
                    $sectionCode = $section->section_code;
                }
            } elseif ($user->role_id === 2) { // Company admin
                // Use the user's section_code if set, otherwise find the main section of their company
                if (!$sectionCode && $companyCode) {
                    $section = Section::where('company_code', $companyCode)
                        ->where('is_active', true)
                        ->orderBy('is_main_stock', 'desc')
                        ->first();
                    
                    if ($section) {
                        $sectionCode = $section->section_code;
                    }
                }
            } elseif ($user->role_id === 3) { // Section admin
                // Already set from $user->section_code
            }

            if (!$companyCode || !$sectionCode) {
                throw new \Exception('Unable to determine company or section for the user. Please ensure your user profile is correctly configured.');
            }

            $bankAccount = BankAccount::create([
                ...$validated,
                'company_code' => $companyCode,
                'section_code' => $sectionCode,
                'current_balance' => $validated['opening_balance'] ?? 0,
                'created_by' => $user->id,
            ]);

            DB::commit();

            return redirect()->route('admin.bank-accounts.index')
                ->with('success', 'Bank account registered successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to register bank account: ' . $e->getMessage());
        }
    }



    private function getLedgerData(BankAccount $bankAccount, $fromDate, $toDate)
    {
        $transactions = collect();

        // 1. Customer payments received into this bank account (DEBIT)
        \App\Models\CustomerPayment::with('customer')
            ->where(function ($query) use ($bankAccount) {
                // Non-cheque payments or card/bank transfer payments
                $query->where('selected_bank_id', $bankAccount->id)
                    ->where('method', '!=', 'cheque');
            })
            ->orWhere(function ($query) use ($bankAccount) {
                // Deposited cheques
                $query->where('deposit_bank_id', $bankAccount->id)
                    ->where('method', 'cheque')
                    ->where('is_deposited', true);
            })
            ->get()
            ->each(function ($p) use (&$transactions) {
                $customerName = $p->customer
                    ? trim($p->customer->FstNm . ' ' . $p->customer->LstNm)
                    : ($p->customer_code ?? 'Customer');
                $description = $customerName . ($p->reference ? ' — Ref: ' . $p->reference : '');
                $description .= ($p->cheque_no ? ' — Cheque: ' . $p->cheque_no : '');
                $description .= ($p->card_auth_code ? ' — Card Ref: ' . $p->card_auth_code : '');
                $description .= ($p->card_last_4 ? ' — Card (****' . $p->card_last_4 . ')' : '');

                // For deposited cheques, we use the deposit date as the transaction date in the ledger
                $displayDate = ($p->method === 'cheque' && $p->is_deposited && $p->deposited_at)
                    ? ($p->deposited_at instanceof \DateTime ? $p->deposited_at->format('Y-m-d') : (string) $p->deposited_at)
                    : ($p->date instanceof \DateTime ? $p->date->format('Y-m-d') : (string) $p->date);

                $transactions->push([
                    'id'          => 'cpy-' . $p->id,
                    'date'        => $displayDate,
                    'type'        => 'debit',
                    'source'      => 'Customer Payment',
                    'description' => $description,
                    'amount'      => (float) $p->amount,
                    'method'      => $p->method,
                    'ref'         => $p->reference ?? $p->cheque_no ?? $p->card_auth_code ?? null,
                    'created_at'  => $p->created_at?->toIso8601String(),
                ]);
            });

        // 2. Supplier payments made from this bank account (CREDIT)
        \App\Models\SupplierPayment::where('selected_bank_id', $bankAccount->id)
            ->get()
            ->each(function ($p) use (&$transactions) {
                $transactions->push([
                    'id'          => 'spy-' . $p->id,
                    'date'        => $p->payment_date instanceof \DateTime ? $p->payment_date->format('Y-m-d') : (string) $p->payment_date,
                    'type'        => 'credit',
                    'source'      => 'Supplier Payment',
                    'description' => ($p->supplier_name ?? 'Supplier') . ($p->payment_no ? ' — ' . $p->payment_no : ''),
                    'amount'      => (float) $p->paid_amount,
                    'method'      => $p->payment_method,
                    'ref'         => $p->bank_reference_no ?? $p->transfer_reference_no ?? $p->cheque_no ?? null,
                    'created_at'  => $p->created_at?->toIso8601String(),
                ]);
            });

        // 3. POS Sales with bank transfer or card payment into this account (DEBIT)
        \App\Models\SalesTransaction::where(function($q) use ($bankAccount) {
                $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(payment_details, '$.bank_account_id')) = ?", [(string) $bankAccount->id])
                  ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(payment_details, '$.card_bank_account_id')) = ?", [(string) $bankAccount->id]);
            })
            ->get()
            ->each(function ($s) use (&$transactions, $bankAccount) {
                $bankAmt = (float) ($s->payment_details['bank_transfer'] ?? 0);
                $cardAmt = (float) ($s->payment_details['card'] ?? 0);
                
                // Check if this specific bank account was used for bank transfer
                if ($bankAmt > 0 && ($s->payment_details['bank_account_id'] ?? null) == $bankAccount->id) {
                    $transactions->push([
                        'id'          => 'pos-bt-' . $s->id,
                        'date'        => $s->transaction_date instanceof \DateTime ? $s->transaction_date->format('Y-m-d') : (string) $s->transaction_date,
                        'type'        => 'debit',
                        'source'      => 'POS Sale (Bank)',
                        'description' => 'Invoice ' . ($s->invoice_no ?? $s->id) . ($s->customer_name ? ' — ' . $s->customer_name : ''),
                        'amount'      => $bankAmt,
                        'method'      => 'bank_transfer',
                        'ref'         => $s->invoice_no ?? null,
                        'created_at'  => $s->created_at?->toIso8601String(),
                    ]);
                }

                // Check if this specific bank account was used for card payment
                if ($cardAmt > 0 && ($s->payment_details['card_bank_account_id'] ?? null) == $bankAccount->id) {
                    $transactions->push([
                        'id'          => 'pos-card-' . $s->id,
                        'date'        => $s->transaction_date instanceof \DateTime ? $s->transaction_date->format('Y-m-d') : (string) $s->transaction_date,
                        'type'        => 'debit',
                        'source'      => 'POS Sale (Card)',
                        'description' => 'Invoice ' . ($s->invoice_no ?? $s->id) . ($s->customer_name ? ' — ' . $s->customer_name : ''),
                        'amount'      => $cardAmt,
                        'method'      => 'card',
                        'ref'         => $s->invoice_no ?? null,
                        'created_at'  => $s->created_at?->toIso8601String(),
                    ]);
                }
            });

        // 4. Delivery payments received into this bank account (DEBIT)
        \App\Models\DeliveryPayment::with('delivery')
            ->where('bank_account_id', $bankAccount->id)
            ->whereIn('method', ['transfer', 'card'])
            ->where('status', 'cleared')
            ->get()
            ->each(function ($p) use (&$transactions) {
                $description = 'Delivery Payment';
                if ($p->delivery) {
                    $description .= ' — ' . ($p->delivery->delivery_number ?? $p->delivery->id);
                }
                
                $transactions->push([
                    'id'          => 'del-' . $p->id,
                    'date'        => $p->payment_date instanceof \DateTime ? $p->payment_date->format('Y-m-d') : (string) $p->payment_date,
                    'type'        => 'debit',
                    'source'      => 'Delivery Payment',
                    'description' => $description,
                    'amount'      => (float) $p->amount,
                    'method'      => $p->method,
                    'ref'         => $p->reference_no ?? null,
                    'created_at'  => $p->created_at?->toIso8601String(),
                ]);
            });

        // 4b. Deposited delivery cheques into this bank account (DEBIT)
        \App\Models\DeliveryPayment::with('delivery')
            ->where('deposit_bank_id', $bankAccount->id)
            ->where('method', 'cheque')
            ->where('is_deposited', true)
            ->get()
            ->each(function ($p) use (&$transactions) {
                $description = 'Delivery Cheque Deposit';
                if ($p->delivery) {
                    $description .= ' — ' . ($p->delivery->delivery_number ?? $p->delivery->id);
                }
                $description .= ($p->cheque_no ? ' | Cheque: ' . $p->cheque_no : '');
                $description .= ($p->bank_name  ? ' | ' . $p->bank_name : '');

                // Use deposited_at as the ledger date (when the money arrived at the bank)
                $displayDate = $p->deposited_at
                    ? ($p->deposited_at instanceof \DateTime ? $p->deposited_at->format('Y-m-d') : (string) $p->deposited_at)
                    : ($p->payment_date instanceof \DateTime ? $p->payment_date->format('Y-m-d') : (string) $p->payment_date);

                $transactions->push([
                    'id'          => 'del-chq-' . $p->id,
                    'date'        => $displayDate,
                    'type'        => 'debit',
                    'source'      => 'Cheque Deposit (Delivery)',
                    'description' => $description,
                    'amount'      => (float) $p->amount,
                    'method'      => 'cheque',
                    'ref'         => $p->cheque_no ?? null,
                    'created_at'  => $p->created_at?->toIso8601String(),
                ]);
            });

        // 4c. Returned deposited delivery cheques from this bank account (CREDIT)
        \App\Models\DeliveryPayment::with('delivery')
            ->where('deposit_bank_id', $bankAccount->id)
            ->where('method', 'cheque')
            ->where('is_deposited', true)
            ->where('status', 'bounced')
            ->get()
            ->each(function ($p) use (&$transactions) {
                $description = 'Cheque Return (Delivery)';
                if ($p->delivery) {
                    $description .= ' — ' . ($p->delivery->delivery_number ?? $p->delivery->id);
                }
                $description .= ($p->cheque_no ? ' | Cheque: ' . $p->cheque_no : '');

                // Use bounced_at as the ledger date
                $displayDate = $p->bounced_at
                    ? ($p->bounced_at instanceof \DateTime ? $p->bounced_at->format('Y-m-d') : (string) $p->bounced_at)
                    : ($p->updated_at instanceof \DateTime ? $p->updated_at->format('Y-m-d') : (string) $p->updated_at);

                $transactions->push([
                    'id'          => 'rtn-del-chq-' . $p->id,
                    'date'        => $displayDate,
                    'type'        => 'credit',
                    'source'      => 'Cheque Return (Delivery)',
                    'description' => $description,
                    'amount'      => (float) $p->amount,
                    'method'      => 'cheque',
                    'ref'         => $p->cheque_no ?? null,
                    'created_at'  => $p->updated_at?->toIso8601String(),
                ]);
            });

        // 4d. Returned deposited customer cheques from this bank account (CREDIT)
        \App\Models\CustomerPayment::with('customer')
            ->where('deposit_bank_id', $bankAccount->id)
            ->where('method', 'cheque')
            ->where('is_deposited', true)
            ->where('status', 'returned')
            ->get()
            ->each(function ($p) use (&$transactions) {
                $customerName = $p->customer
                    ? trim($p->customer->FstNm . ' ' . $p->customer->LstNm)
                    : ($p->customer_code ?? 'Customer');
                $description = 'Cheque Return — ' . $customerName;
                $description .= ($p->cheque_no ? ' | Cheque: ' . $p->cheque_no : '');

                // Use updated_at as the ledger date (when the cheque was returned)
                $displayDate = $p->updated_at
                    ? ($p->updated_at instanceof \DateTime ? $p->updated_at->format('Y-m-d') : (string) $p->updated_at)
                    : ($p->date instanceof \DateTime ? $p->date->format('Y-m-d') : (string) $p->date);

                $transactions->push([
                    'id'          => 'rtn-cpy-' . $p->id,
                    'date'        => $displayDate,
                    'type'        => 'credit',
                    'source'      => 'Cheque Return',
                    'description' => $description,
                    'amount'      => (float) $p->amount,
                    'method'      => 'cheque',
                    'ref'         => $p->cheque_no ?? null,
                    'created_at'  => $p->updated_at?->toIso8601String(),
                ]);
            });

        // 5. Finance Account Transactions (Vouchers) affecting this bank account
        \App\Models\FinanceAccountTransaction::where('bank_account_id', $bankAccount->id)
            ->get()
            ->each(function ($t) use (&$transactions) {
                $transactions->push([
                    'id'          => 'fat-' . $t->id,
                    'date'        => $t->date instanceof \DateTime ? $t->date->format('Y-m-d') : (string) $t->date,
                    'type'        => $t->type,
                    'source'      => 'Finance Voucher',
                    'description' => $t->description ?? 'Finance Voucher Transaction',
                    'amount'      => (float) $t->amount,
                    'method'      => $t->method,
                    'ref'         => $t->reference ?? null,
                    'created_at'  => $t->created_at?->toIso8601String(),
                ]);
            });

        // Sort chronologically (oldest first)
        $ledger = $transactions->sortBy('date')->values();

        $broughtForwardBalance = (float) $bankAccount->opening_balance;
        
        $pastTransactions = $ledger->filter(function($t) use ($fromDate) {
            return $fromDate && \Carbon\Carbon::parse($t['date'])->startOfDay() < \Carbon\Carbon::parse($fromDate)->startOfDay();
        });

        $periodTransactions = $ledger->filter(function($t) use ($fromDate, $toDate) {
            $date = \Carbon\Carbon::parse($t['date'])->startOfDay();
            if ($fromDate && $date < \Carbon\Carbon::parse($fromDate)->startOfDay()) return false;
            if ($toDate && $date > \Carbon\Carbon::parse($toDate)->startOfDay()) return false;
            return true;
        })->values();

        // Calculate B/F
        foreach ($pastTransactions as $t) {
            if ($t['type'] === 'debit') {
                $broughtForwardBalance += $t['amount'];
            } else {
                $broughtForwardBalance -= $t['amount'];
            }
        }

        $balance = $broughtForwardBalance;
        $totalCredits = 0.0;
        $totalDebits = 0.0;
        
        $ledgerWithBalance = collect();
        
        // Add opening balance / B/F as the first item
        $ledgerWithBalance->push([
            'id' => 'OB-0',
            'date' => $fromDate ? $fromDate . ' 00:00:00' : ($bankAccount->created_at ? $bankAccount->created_at->format('Y-m-d H:i:s') : \Carbon\Carbon::parse('1970-01-01')->format('Y-m-d H:i:s')),
            'source' => 'System',
            'description' => $fromDate ? 'Brought Forward Balance' : 'Opening Balance',
            'method' => '-',
            'ref' => '-',
            'type' => 'debit',
            'amount' => $broughtForwardBalance,
            'running_balance' => $broughtForwardBalance,
            'created_at' => $fromDate ? $fromDate . ' 00:00:00' : ($bankAccount->created_at ? $bankAccount->created_at->format('Y-m-d H:i:s') : \Carbon\Carbon::parse('1970-01-01')->format('Y-m-d H:i:s')),
        ]);

        foreach ($periodTransactions as $t) {
            if ($t['type'] === 'debit') {
                $balance += $t['amount'];
                $totalDebits += $t['amount'];
            } else {
                $balance -= $t['amount'];
                $totalCredits += $t['amount'];
            }
            $t['running_balance'] = round($balance, 2);
            $ledgerWithBalance->push($t);
        }

        return [
            'transactions' => $ledgerWithBalance->values(),
            'openingBalance' => $broughtForwardBalance,
            'totalCredits' => $totalCredits,
            'totalDebits' => $totalDebits,
            'closingBalance' => $balance,
        ];
    }

    public function exportCsv(BankAccount $bankAccount)
    {
        if (! request()->user()->hasPermission('bank_accounts.view')) {
            abort(403, 'Unauthorized.');
        }

        $fromDate = request('from_date');
        $toDate = request('to_date');

        $ledgerData = $this->getLedgerData($bankAccount, $fromDate, $toDate);
        $transactions = $ledgerData['transactions'];

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=bank-account-ledger-{$bankAccount->account_name}-" . date('Y-m-d') . ".csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function() use($transactions) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['Date', 'Reference', 'Description', 'Method', 'Debit (In)', 'Credit (Out)', 'Balance']);

            foreach ($transactions as $t) {
                fputcsv($file, [
                    \Carbon\Carbon::parse($t['date'])->format('d/m/Y, H:i'),
                    $t['ref'],
                    $t['description'],
                    $t['method'],
                    $t['type'] === 'debit' ? number_format((float)$t['amount'], 2, '.', '') : '',
                    $t['type'] === 'credit' ? number_format((float)$t['amount'], 2, '.', '') : '',
                    number_format((float)$t['running_balance'], 2, '.', '')
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function downloadPdf(BankAccount $bankAccount)
    {
        if (! request()->user()->hasPermission('bank_accounts.view')) {
            abort(403, 'Unauthorized.');
        }

        $fromDate = request('from_date');
        $toDate = request('to_date');

        $ledgerData = $this->getLedgerData($bankAccount, $fromDate, $toDate);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.bank-account-ledger-pdf', [
            'bankAccount' => $bankAccount->load('company'),
            'transactions' => $ledgerData['transactions'],
            'stats' => [
                'openingBalance' => $ledgerData['openingBalance'],
                'totalCredits' => $ledgerData['totalCredits'],
                'totalDebits' => $ledgerData['totalDebits'],
                'closingBalance' => $ledgerData['closingBalance'],
            ],
            'fromDate' => $fromDate,
            'toDate' => $toDate,
        ]);

        return $pdf->download("bank-account-ledger-{$bankAccount->account_name}-" . date('Y-m-d') . ".pdf");
    }

    /**
     * Display the specified bank account.
     */
    public function show(BankAccount $bankAccount): Response
    {
        if (! request()->user()->hasPermission('bank_accounts.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }
        $user = Auth::user();

        // Authorization check
        if ($user->role_id === 3 && $bankAccount->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $bankAccount->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        // $fromDateInput = request()->filled('from_date') ? request('from_date') : null;
        // $toDateInput   = request()->filled('to_date')   ? request('to_date')   : null;

        $fromDateInput = request()->has('from_date') ? request('from_date') : now()->subDays(7)->format('Y-m-d');
        $toDateInput = request()->has('to_date') ? request('to_date') : now()->format('Y-m-d');
        $fromDate = $fromDateInput ?: null;
        $toDate   = $toDateInput   ?: null;


        $ledgerData = $this->getLedgerData($bankAccount, $fromDate, $toDate);

        return Inertia::render('admin/bank-accounts/show', [
            'bankAccount'  => $bankAccount->load(['creator', 'company', 'section']),
            'transactions' => $ledgerData['transactions'],
            'stats' => [
                'openingBalance' => $ledgerData['openingBalance'],
                'totalCredits' => $ledgerData['totalCredits'],
                'totalDebits' => $ledgerData['totalDebits'],
                'closingBalance' => $ledgerData['closingBalance'],
            ],
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ]
        ]);
    }

    /**
     * Show the form for editing the specified bank account.
     */
    public function edit(BankAccount $bankAccount): Response
    {
        if (! request()->user()->hasPermission('bank_accounts.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }
        $user = Auth::user();

        // Authorization check
        if ($user->role_id === 3 && $bankAccount->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $bankAccount->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        $companies = collect();
        $sections = collect();

        // Get available companies and sections based on user role
        if ($user->role_id === 1) { // Superadmin
            $companies = Company::all();
            $sections = Section::all();
        } elseif ($user->role_id === 2) { // Company admin
            $companies = Company::where('company_code', $user->company_code)->get();
            $sections = Section::where('company_code', $user->company_code)->get();
        } elseif ($user->role_id === 3) { // Section admin
            $companies = Company::where('company_code', $user->company_code)->get();
            $userSection = Section::where('section_code', $user->section_code)->first();
            if ($userSection) {
                $sections = collect([$userSection]);
            }
        }

        return Inertia::render('admin/bank-accounts/edit', [
            'bankAccount' => $bankAccount,
            'companies' => $companies->map(function ($company) {
                return [
                    'value' => $company->company_code,
                    'label' => $company->company_name,
                ];
            }),
            'sections' => $sections->map(function ($section) {
                return [
                    'value' => $section->section_code,
                    'label' => $section->name,
                ];
            }),
        ]);
    }

    /**
     * Update the specified bank account in storage.
     */
    public function update(Request $request, BankAccount $bankAccount): RedirectResponse
    {
        if (! request()->user()->hasPermission('bank_accounts.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $validated = $request->validate([
            'account_name' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:50', 'unique:bank_accounts,account_number,' . $bankAccount->id],
            'bank_name' => ['required', 'string', 'max:255'],
            'branch_name' => ['required', 'string', 'max:255'],
            'account_type' => ['required', 'in:savings,current,checking'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:500'],
            'status' => ['required', 'in:active,inactive,closed'],
        ]);

        // Ensure opening_balance has a default value
        $validated['opening_balance'] = $validated['opening_balance'] ?? 0;

        // Convert empty string to 0 for opening_balance
        if ($validated['opening_balance'] === '') {
            $validated['opening_balance'] = 0;
        }

        $user = Auth::user();

        // Authorization check
        if ($user->role_id === 3 && $bankAccount->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $bankAccount->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        try {
            $bankAccount->update($validated);

            return redirect()->route('admin.bank-accounts.index')
                ->with('success', 'Bank account updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update bank account: ' . $e->getMessage());
        }
    }

    /**
     * Toggle active/inactive status for a bank account
     */
    public function toggleStatus(BankAccount $bankAccount): RedirectResponse
    {
        if (! request()->user()->hasPermission('bank_accounts.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $bankAccount->update([
            'status' => $bankAccount->status === 'active' ? 'inactive' : 'active'
        ]);

        return back()->with('success', $bankAccount->status === 'active'
            ? 'Bank account activated successfully!'
            : 'Bank account deactivated successfully!');
    }

    /**
     * Remove the specified bank account from storage.
     */
    public function destroy(BankAccount $bankAccount): RedirectResponse
    {
        if (! request()->user()->hasPermission('bank_accounts.delete')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }
        $user = Auth::user();

        // Authorization check
        if ($user->role_id === 3 && $bankAccount->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $bankAccount->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        try {
            $bankAccount->delete();

            return redirect()->route('admin.bank-accounts.index')
                ->with('success', 'Bank account deleted successfully.');

        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Failed to delete bank account: ' . $e->getMessage());
        }
    }
}
