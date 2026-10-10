<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FinanceAccount;
use App\Enums\FinanceAccountType;
use App\Models\Company;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FinanceAccountController extends Controller
{
    /**
     * Display a listing of finance accounts.
     */
    public function index(Request $request)
    {
        if (! request()->user()->hasPermission('finance_accounts.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $query = FinanceAccount::with(['creator', 'company', 'section']);

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
                $q->where('account_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('main_category')) {
            $query->where('main_category', $request->main_category);
        }

        if ($request->filled('company_code')) {
            $query->where('company_code', $request->company_code);
        }

        if ($request->filled('section_code')) {
            $query->where('section_code', $request->section_code);
        }

        $financeAccounts = $query->latest()->paginate(200);

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

        return Inertia::render('admin/finance-accounts/index', [
            'financeAccounts' => $financeAccounts,
            'filters' => $request->only(['search', 'status', 'company_code', 'section_code', 'main_category']),
            'companies' => $companies->map(function ($company) {
                return [
                    'value' => $company->company_code,
                    'label' => $company->name,
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
     * Show the form for creating a new finance account.
     */
    public function create(): Response
    {
        if (! request()->user()->hasPermission('finance_accounts.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }
        return Inertia::render('admin/finance-accounts/create');
    }

    public function store(Request $request): RedirectResponse
    {
        if (! request()->user()->hasPermission('finance_accounts.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $validated = $request->validate([
            'account_name' => ['required', 'string', 'max:255'],
            'main_category' => ['required', 'in:assets,liabilities,equity,revenue,expenses'],
            'account_type' => ['required', 'in:cash,cheque,online,qr_payment,petty_cash,delivery_petty_cash'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'cut_off_date' => ['nullable', 'date'],
            'status' => ['required', 'boolean'],
        ]);

        // Ensure opening_balance has a default value
        $validated['opening_balance'] = $validated['opening_balance'] ?? 0;

        // Convert empty string to 0 for opening_balance
        if ($validated['opening_balance'] === '') {
            $validated['opening_balance'] = 0;
        }

        // Auto-set cut_off_date when opening balance is provided
        $ob = (float) $validated['opening_balance'];
        if ($ob > 0 && empty($validated['cut_off_date'])) {
            $validated['cut_off_date'] = now()->toDateTimeString();
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

            // Prevent multiple Petty Cash / Delivery Petty Cash accounts
            if (in_array($validated['account_type'], ['petty_cash', 'delivery_petty_cash'])) {
                $exists = FinanceAccount::where('company_code', $companyCode)
                    ->where('section_code', $sectionCode)
                    ->where('account_type', $validated['account_type'])
                    ->exists();

                if ($exists) {
                    throw new \Exception('A ' . str_replace('_', ' ', $validated['account_type']) . ' account already exists for this company/section. Only one is allowed.');
                }
            }

            FinanceAccount::create([
                ...$validated,
                'company_code' => $companyCode,
                'section_code' => $sectionCode,
                'current_balance' => $validated['opening_balance'] ?? 0,
                'created_by' => $user->id,
            ]);

            DB::commit();

            return redirect()->route('admin.finance-accounts.index')
                ->with('success', 'Finance account created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create finance account: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified finance account.
     */
    private function getLedgerData(FinanceAccount $financeAccount, $fromDate, $toDate)
    {
        $transactions = collect();
        $broughtForwardBalance = (float)$financeAccount->opening_balance;
        $totalCredits = 0.0;
        $totalDebits = 0.0;
        
        if ($financeAccount->account_type->value === 'cash') {
            // First, calculate brought forward balance if from_date is set
            if ($fromDate) {
                $pastDebits = \App\Models\FinanceAccountTransaction::where('finance_account_id', $financeAccount->id)
                    ->whereDate('date', '<', $fromDate)
                    ->where('type', 'debit')
                    ->sum('amount');
                    
                $pastCredits = \App\Models\FinanceAccountTransaction::where('finance_account_id', $financeAccount->id)
                    ->whereDate('date', '<', $fromDate)
                    ->where('type', 'credit')
                    ->sum('amount');
                    
                if (in_array($financeAccount->main_category->value, ['liabilities', 'revenue', 'equity'])) {
                    $broughtForwardBalance += $pastCredits - $pastDebits;
                } else {
                    $broughtForwardBalance += $pastDebits - $pastCredits;
                }
            }

            // Now fetch transactions within range
            $query = \App\Models\FinanceAccountTransaction::where('finance_account_id', $financeAccount->id);
            
            if ($fromDate) {
                $query->whereDate('date', '>=', $fromDate);
            }
            if ($toDate) {
                $query->whereDate('date', '<=', $toDate);
            }

            $rawTransactions = $query->orderBy('date', 'asc')->orderBy('id', 'asc')->get();

            $groupedTransactions = collect();
            $salesGroups = [];

            foreach ($rawTransactions as $t) {
                $source = class_basename($t->source_type);
                $dateStr = \Carbon\Carbon::parse($t->date)->format('Y-m-d');
                $type = $t->type;

                if ($source === 'SalesTransaction') {
                    $groupKey = $dateStr . '_' . $type;
                    if (!isset($salesGroups[$groupKey])) {
                        $salesGroups[$groupKey] = [
                            'id' => 'sales-' . $groupKey,
                            'date' => $dateStr . ' 23:59:59',
                            'source' => 'SalesTransaction',
                            'description' => 'Total Cash Sales for ' . str_replace('-', '/', $dateStr),
                            'method' => $t->method,
                            'ref' => '-',
                            'type' => $type,
                            'amount' => 0.0,
                            'created_at' => $dateStr . ' 23:59:59',
                        ];
                    }
                    $salesGroups[$groupKey]['amount'] += (float) $t->amount;
                } else {
                    $groupedTransactions->push([
                        'id' => $t->id,
                        'date' => \Carbon\Carbon::parse($t->date)->format('Y-m-d H:i:s'),
                        'source' => $source,
                        'description' => $t->description ?? ($t->type === 'debit' ? 'Cash Received' : 'Cash Paid'),
                        'method' => $t->method,
                        'ref' => $t->reference ?? '-',
                        'type' => $t->type,
                        'amount' => (float) $t->amount,
                        'created_at' => $t->created_at ? $t->created_at->format('Y-m-d H:i:s') : \Carbon\Carbon::parse($t->date)->format('Y-m-d H:i:s'),
                    ]);
                }
            }

            foreach ($salesGroups as $grp) {
                if ($grp['amount'] > 0) {
                    $groupedTransactions->push($grp);
                }
            }

            $transactions = $groupedTransactions->sortBy('created_at')->values();
        }
        
        $balance = $broughtForwardBalance;
        $ledgerWithBalance = collect();
        
        // Add opening balance / B/F as the first item
        $ledgerWithBalance->push([
            'id' => 'OB-0',
            'date' => $fromDate ? $fromDate . ' 00:00:00' : ($financeAccount->created_at ? $financeAccount->created_at->format('Y-m-d H:i:s') : \Carbon\Carbon::parse('1970-01-01')->format('Y-m-d H:i:s')),
            'source' => 'System',
            'description' => $fromDate ? 'Opening Balance ' : 'Brought Forward Balance',
            'method' => '-',
            'ref' => '-',
            'type' => 'debit',
            'amount' => $broughtForwardBalance,
            'running_balance' => $broughtForwardBalance,
            'created_at' => $fromDate ? $fromDate . ' 00:00:00' : ($financeAccount->created_at ? $financeAccount->created_at->format('Y-m-d H:i:s') : \Carbon\Carbon::parse('1970-01-01')->format('Y-m-d H:i:s')),
        ]);

        $isCreditNormal = in_array($financeAccount->main_category->value, ['liabilities', 'revenue', 'equity']);
        
        foreach($transactions as $t) {
            if ($t['type'] === 'debit') {
                $totalDebits += $t['amount'];
                if ($isCreditNormal) {
                    $balance -= $t['amount'];
                } else {
                    $balance += $t['amount'];
                }
            } else {
                $totalCredits += $t['amount'];
                if ($isCreditNormal) {
                    $balance += $t['amount'];
                } else {
                    $balance -= $t['amount'];
                }
            }
            $t['running_balance'] = $balance;
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

    /**
     * Display the specified finance account.
     */
    public function show(Request $request, FinanceAccount $financeAccount): Response
    {
        if (! $request->user()->hasPermission('finance_accounts.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }
        $user = Auth::user();

        // Authorization check
        if ($user->role_id === 3 && $financeAccount->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $financeAccount->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        $fromDateInput = $request->has('from_date') ? $request->input('from_date') : now()->subDays(7)->format('Y-m-d');
        $toDateInput = $request->has('to_date') ? $request->input('to_date') : now()->format('Y-m-d');

        $fromDate = $fromDateInput ?: null;
        $toDate = $toDateInput ?: null;

        $ledgerData = $this->getLedgerData($financeAccount, $fromDate, $toDate);

        return Inertia::render('admin/finance-accounts/show', [
            'financeAccount'  => $financeAccount->load(['creator', 'company', 'section']),
            'transactions'    => $ledgerData['transactions'],
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

    public function exportCsv(Request $request, FinanceAccount $financeAccount)
    {
        if (! $request->user()->hasPermission('finance_accounts.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $fromDate = $request->input('from_date') ?: null;
        $toDate = $request->input('to_date') ?: null;

        $ledgerData = $this->getLedgerData($financeAccount, $fromDate, $toDate);
        $transactions = $ledgerData['transactions'];

        $filename = "finance_account_{$financeAccount->account_name}_ledger.csv";

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['Date', 'Reference', 'Description', 'Method', 'Debit (In)', 'Credit (Out)', 'Balance'];

        $callback = function() use ($transactions, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($transactions as $t) {
                fputcsv($file, [
                    \Carbon\Carbon::parse($t['date'])->format('d M Y, h:i A'),
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

    public function downloadPdf(Request $request, FinanceAccount $financeAccount)
    {
        if (! $request->user()->hasPermission('finance_accounts.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $fromDate = $request->input('from_date') ?: null;
        $toDate = $request->input('to_date') ?: null;

        $ledgerData = $this->getLedgerData($financeAccount, $fromDate, $toDate);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.finance-account-ledger-pdf', [
            'financeAccount' => $financeAccount->load(['company', 'section']),
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

        return $pdf->download("finance_account_{$financeAccount->account_name}_ledger.pdf");
    }

    /**
     * Show the form for editing the specified finance account.
     */
    public function edit(FinanceAccount $financeAccount): Response
    {
        if (! request()->user()->hasPermission('finance_accounts.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }
        $user = Auth::user();

        // Authorization check
        if ($user->role_id === 3 && $financeAccount->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $financeAccount->company_code !== $user->company_code) {
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

        return Inertia::render('admin/finance-accounts/edit', [
            'financeAccount' => $financeAccount,
            'companies' => $companies->map(function ($company) {
                return [
                    'value' => $company->company_code,
                    'label' => $company->name,
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
     * Update the specified finance account in storage.
     */
    public function update(Request $request, FinanceAccount $financeAccount): RedirectResponse
    {
        if (! request()->user()->hasPermission('finance_accounts.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $validated = $request->validate([
            'account_name' => ['required', 'string', 'max:255'],
            'main_category' => ['required', 'in:assets,liabilities,equity,revenue,expenses'],
            'account_type' => ['required', 'in:cash,cheque,online,qr_payment,petty_cash,delivery_petty_cash'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'cut_off_date' => ['nullable', 'date'],
            'status' => ['required', 'boolean'],
        ]);

        // Ensure opening_balance has a default value
        $validated['opening_balance'] = $validated['opening_balance'] ?? 0;

        // Convert empty string to 0 for opening_balance
        if ($validated['opening_balance'] === '') {
            $validated['opening_balance'] = 0;
        }

        // Lock opening balance if it was previously set (> 0)
        if ($financeAccount->opening_balance > 0) {
            unset($validated['opening_balance']);
        }

        // Auto-set cut_off_date when opening balance is first set
        if ($financeAccount->opening_balance == 0 && (float) $validated['opening_balance'] > 0 && !$financeAccount->cut_off_date) {
            $validated['cut_off_date'] = now()->toDateTimeString();
        } else {
            // Lock cut_off_date - it is auto-recorded, never editable
            unset($validated['cut_off_date']);
        }

        $user = Auth::user();

        // Authorization check
        if ($user->role_id === 3 && $financeAccount->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $financeAccount->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        try {
            DB::beginTransaction();

            // Prevent multiple Petty Cash / Delivery Petty Cash accounts
            if (
                in_array($validated['account_type'], ['petty_cash', 'delivery_petty_cash']) && 
                $financeAccount->account_type->value !== $validated['account_type']
            ) {
                $exists = FinanceAccount::where('company_code', $financeAccount->company_code)
                    ->where('section_code', $financeAccount->section_code)
                    ->where('account_type', $validated['account_type'])
                    ->exists();

                if ($exists) {
                    throw new \Exception('A ' . str_replace('_', ' ', $validated['account_type']) . ' account already exists for this company/section. Only one is allowed.');
                }
            }

            $financeAccount->update($validated);

            // Recalculate current_balance based on new opening_balance and all transactions
            $transactions = \App\Models\FinanceAccountTransaction::where('finance_account_id', $financeAccount->id)->get();
            $debits = $transactions->where('type', 'debit')->sum('amount');
            $credits = $transactions->where('type', 'credit')->sum('amount');
            
            if (in_array($financeAccount->main_category->value, ['liabilities', 'revenue', 'equity'])) {
                $financeAccount->current_balance = $financeAccount->opening_balance + $credits - $debits;
            } else {
                $financeAccount->current_balance = $financeAccount->opening_balance + $debits - $credits;
            }
            
            $financeAccount->save();
            
            DB::commit();

            return redirect()->route('admin.finance-accounts.index')
                ->with('success', 'Finance account updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update finance account: ' . $e->getMessage());
        }
    }

    /**
     * Toggle active/inactive status for a finance account
     */
    public function toggleStatus(FinanceAccount $financeAccount): RedirectResponse
    {
        if (! request()->user()->hasPermission('finance_accounts.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $financeAccount->update([
            'status' => !$financeAccount->status
        ]);

        return back()->with('success', $financeAccount->status
            ? 'Finance account activated successfully!'
            : 'Finance account deactivated successfully!');
    }

    /**
     * Remove the specified finance account from storage.
     */
    // public function destroy(FinanceAccount $financeAccount): RedirectResponse
    // {
    //     if (! request()->user()->hasPermission('finance_accounts.delete')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }
    //     $user = Auth::user();

    //     // Authorization check
    //     if ($user->role_id === 3 && $financeAccount->section_code !== $user->section_code) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     if ($user->role_id === 2 && $financeAccount->company_code !== $user->company_code) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     try {
    //         $financeAccount->delete();

    //         return redirect()->route('admin.finance-accounts.index')
    //             ->with('success', 'Finance account deleted successfully.');

    //     } catch (\Exception $e) {
    //         return redirect()->back()
    //             ->with('error', 'Failed to delete finance account: ' . $e->getMessage());
    //     }
    // }
}
