<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ExpenseAccount;
use App\Models\Company;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// class ExpenseAccountController extends Controller
// {
    /**
     * Display a listing of expense accounts.
     */
    // public function index(Request $request)
    // {
    //     if (! request()->user()->hasPermission('expense_accounts.view')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }

    //     $query = ExpenseAccount::with(['creator', 'company', 'section']);

    //     // Filter by company/section for non-superadmin users
    //     $user = Auth::guard('web')->user() ?? Auth::guard('company')->user();
    //     if ($user && $user->role_id !== 1) { // Not superadmin
    //         if ($user->role_id === 3) { // Branch/Section admin - filter by their section
    //             $query->where('section_code', $user->section_code);
    //         } else { // Company admin - filter by their company
    //             $query->where('company_code', $user->company_code);
    //         }
    //     }

    //     // Apply filters
    //     if ($request->filled('search')) {
    //         $search = $request->search;
    //         $query->where(function ($q) use ($search) {
    //             $q->where('account_name', 'like', "%{$search}%");
    //         });
    //     }

    //     if ($request->filled('status')) {
    //         $query->where('status', $request->status);
    //     }

    //     if ($request->filled('company_code')) {
    //         $query->where('company_code', $request->company_code);
    //     }

    //     if ($request->filled('section_code')) {
    //         $query->where('section_code', $request->section_code);
    //     }

    //     $expenseAccounts = $query->latest()->paginate(15);

    //     // Get available companies and sections based on user role
    //     $companies = collect();
    //     $sections = collect();

    //     if ($user) {
    //         if ($user->role_id === 1) { // Superadmin - all companies and sections
    //             $companies = Company::all();
    //             $sections = Section::all();
    //         } elseif ($user->role_id === 2) { // Company admin - their company and its sections
    //             $companies = Company::where('company_code', $user->company_code)->get();
    //             $sections = Section::where('company_code', $user->company_code)->get();
    //         } elseif ($user->role_id === 3) { // Section admin - their company and section
    //             $companies = Company::where('company_code', $user->company_code)->get();
    //             $userSection = Section::where('section_code', $user->section_code)->first();
    //             if ($userSection) {
    //                 $sections = collect([$userSection]);
    //             }
    //         }
    //     }

    //     return Inertia::render('admin/ExpenseAccounts/Index', [
    //         'expenseAccounts' => $expenseAccounts,
    //         'filters' => $request->only(['search', 'status', 'company_code', 'section_code']),
    //         'companies' => $companies->map(function ($company) {
    //             return [
    //                 'value' => $company->company_code,
    //                 'label' => $company->name,
    //             ];
    //         }),
    //         'branches' => $sections->map(function ($section) {
    //             return [
    //                 'value' => $section->section_code,
    //                 'label' => $section->name,
    //             ];
    //         }),
    //     ]);
    // }

    /**
     * Show the form for creating a new expense account.
     */
    // public function create(): Response
    // {
    //     if (! request()->user()->hasPermission('expense_accounts.create')) {
    //         abort(403, 'Unauthorized.');
    //     }
    //     return Inertia::render('admin/ExpenseAccounts/Create');
    // }

    // public function store(Request $request): RedirectResponse
    // {
    //     if (! request()->user()->hasPermission('expense_accounts.create')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }

    //     $validated = $request->validate([
    //         'account_name' => ['required', 'string', 'max:255'],
    //         'description' => ['nullable', 'string'],
    //         'status' => ['required', 'boolean'],
    //     ]);

    //     try {
    //         DB::beginTransaction();

    //         $user = Auth::guard('web')->user() ?? Auth::guard('company')->user();

    //         if (!$user) {
    //             throw new \Exception('User not authenticated.');
    //         }

    //         // Determine company and section based on user role
    //         $companyCode = $user->company_code;
    //         $sectionCode = $user->section_code;

    //         if ($user->role_id === 1) { // Super admin
    //             if (!$companyCode || !$sectionCode) {
    //                 $section = Section::where('is_active', true)
    //                     ->orderBy('is_main_stock', 'desc')
    //                     ->first();

    //                 if (!$section) {
    //                     throw new \Exception('No valid sections found in the system.');
    //                 }
    //                 $companyCode = $section->company_code;
    //                 $sectionCode = $section->section_code;
    //             }
    //         } elseif ($user->role_id === 2) { // Company admin
    //             if (!$sectionCode && $companyCode) {
    //                 $section = Section::where('company_code', $companyCode)
    //                     ->where('is_active', true)
    //                     ->orderBy('is_main_stock', 'desc')
    //                     ->first();
                    
    //                 if ($section) {
    //                     $sectionCode = $section->section_code;
    //                 }
    //             }
    //         }

    //         if (!$companyCode || !$sectionCode) {
    //             throw new \Exception('Unable to determine company or section for the user.');
    //         }

    //         ExpenseAccount::create([
    //             ...$validated,
    //             'company_code' => $companyCode,
    //             'section_code' => $sectionCode,
    //             'created_by' => $user->id,
    //         ]);

    //         DB::commit();

    //         return redirect()->route('admin.expense-accounts.index')
    //             ->with('success', 'Expense account created successfully.');

    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         return redirect()->back()
    //             ->withInput()
    //             ->with('error', 'Failed to create expense account: ' . $e->getMessage());
    //     }
    // }

    /**
     * Display the specified expense account and its ledger.
     */
    // public function show(Request $request, ExpenseAccount $expenseAccount): Response
    // {
    //     $user = Auth::user();

    //     if (! $user->hasPermission('expense_accounts.view')) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     // Authorization check
    //     if ($user->role_id === 3 && $expenseAccount->section_code !== $user->section_code) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     if ($user->role_id === 2 && $expenseAccount->company_code !== $user->company_code) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     $fromDateInput = $request->has('from_date') ? $request->input('from_date') : now()->subDays(7)->format('Y-m-d');
    //     $toDateInput = $request->has('to_date') ? $request->input('to_date') : now()->format('Y-m-d');

    //     $fromDate = $fromDateInput ?: null;
    //     $toDate = $toDateInput ?: null;

    //     $broughtForwardBalance = 0.0;
        
    //     // Calculate brought forward balance
    //     if ($fromDate) {
    //         $pastDeposits = \App\Models\FinanceVoucher::where('type', 'deposit')
    //             ->where('expense_account_id', $expenseAccount->id)
    //             ->whereDate('date', '<', $fromDate)
    //             ->sum('amount');
                
    //         $pastWithdrawals = \App\Models\FinanceVoucher::where('type', 'withdraw')
    //             ->where('expense_account_id', $expenseAccount->id)
    //             ->whereDate('date', '<', $fromDate)
    //             ->sum('amount');
                
    //         $pastTransfersIn = \App\Models\FinanceVoucher::where('type', 'transfer')
    //             ->where('to_expense_account_id', $expenseAccount->id)
    //             ->whereDate('date', '<', $fromDate)
    //             ->sum('amount');
                
    //         $broughtForwardBalance = $pastDeposits + $pastTransfersIn - $pastWithdrawals;
    //     }

    //     // Fetch transactions within range
    //     $query = \App\Models\FinanceVoucher::where(function($q) use ($expenseAccount) {
    //             $q->where('expense_account_id', $expenseAccount->id)
    //               ->orWhere('to_expense_account_id', $expenseAccount->id);
    //         });
            
    //     if ($fromDate) {
    //         $query->whereDate('date', '>=', $fromDate);
    //     }
    //     if ($toDate) {
    //         $query->whereDate('date', '<=', $toDate);
    //     }

    //     $rawTransactions = $query->orderBy('date', 'asc')->orderBy('id', 'asc')->get();

    //     $ledgerWithBalance = collect();
        
    //     // Add brought forward record if applicable
    //     if ($fromDate) {
    //         $ledgerWithBalance->push([
    //             'id' => 'OB-0',
    //             'date' => $fromDate,
    //             'finance_voucher_no' => '-',
    //             'description' => 'Brought Forward',
    //             'type' => 'brought_forward',
    //             'amount' => $broughtForwardBalance,
    //             'balance' => $broughtForwardBalance,
    //             'debit' => null,
    //             'credit' => null,
    //         ]);
    //     }

    //     $runningBalance = $broughtForwardBalance;

    //     foreach ($rawTransactions as $tx) {
    //         $isDepositOrTransferIn = false;
    //         $amount = (float) $tx->amount;
            
    //         if ($tx->type === 'deposit') {
    //             $isDepositOrTransferIn = true;
    //         } elseif ($tx->type === 'transfer' && $tx->to_expense_account_id === $expenseAccount->id) {
    //             $isDepositOrTransferIn = true;
    //         } elseif ($tx->type === 'withdraw') {
    //             $isDepositOrTransferIn = false;
    //         }

    //         if ($isDepositOrTransferIn) {
    //             $runningBalance += $amount;
    //         } else {
    //             $runningBalance -= $amount;
    //         }

    //         $ledgerWithBalance->push([
    //             'id' => $tx->id,
    //             'date' => $tx->date,
    //             'finance_voucher_no' => $tx->finance_voucher_no,
    //             'description' => $tx->description ?: ($isDepositOrTransferIn ? 'Funds Received' : 'Expense Recorded'),
    //             'type' => $tx->type,
    //             'amount' => $amount,
    //             'balance' => $runningBalance,
    //             'debit' => $isDepositOrTransferIn ? $amount : null,
    //             'credit' => $isDepositOrTransferIn ? null : $amount,
    //         ]);
    //     }

    //     return Inertia::render('admin/ExpenseAccounts/Show', [
    //         'expenseAccount' => [
    //             'id' => $expenseAccount->id,
    //             'account_name' => $expenseAccount->account_name,
    //             'description' => $expenseAccount->description,
    //             'current_balance' => (float)$expenseAccount->current_balance,
    //             'status' => $expenseAccount->status,
    //             'company' => $expenseAccount->company ? ['name' => $expenseAccount->company->name] : null,
    //             'section' => $expenseAccount->section ? ['name' => $expenseAccount->section->name] : null,
    //         ],
    //         'transactions' => $ledgerWithBalance,
    //         'filters' => [
    //             'from_date' => $fromDateInput,
    //             'to_date' => $toDateInput,
    //         ]
    //     ]);
    // }

    /**
     * Show the form for editing the specified expense account.
     */
    // public function edit(ExpenseAccount $expenseAccount): Response
    // {
    //     $user = Auth::user();

    //     if (! $user->hasPermission('expense_accounts.edit')) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     // Authorization check
    //     if ($user->role_id === 3 && $expenseAccount->section_code !== $user->section_code) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     if ($user->role_id === 2 && $expenseAccount->company_code !== $user->company_code) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     $companies = collect();
    //     $sections = collect();

    //     // Get available companies and sections based on user role
    //     if ($user->role_id === 1) { // Superadmin
    //         $companies = Company::all();
    //         $sections = Section::all();
    //     } elseif ($user->role_id === 2) { // Company admin
    //         $companies = Company::where('company_code', $user->company_code)->get();
    //         $sections = Section::where('company_code', $user->company_code)->get();
    //     } elseif ($user->role_id === 3) { // Section admin
    //         $companies = Company::where('company_code', $user->company_code)->get();
    //         $userSection = Section::where('section_code', $user->section_code)->first();
    //         if ($userSection) {
    //             $sections = collect([$userSection]);
    //         }
    //     }

    //     return Inertia::render('admin/ExpenseAccounts/Edit', [
    //         'expenseAccount' => $expenseAccount,
    //         'companies' => $companies->map(function ($company) {
    //             return [
    //                 'value' => $company->company_code,
    //                 'label' => $company->name,
    //             ];
    //         }),
    //         'sections' => $sections->map(function ($section) {
    //             return [
    //                 'value' => $section->section_code,
    //                 'label' => $section->name,
    //             ];
    //         }),
    //     ]);
    // }

    /**
     * Update the specified expense account in storage.
     */
    // public function update(Request $request, ExpenseAccount $expenseAccount): RedirectResponse
    // {
    //     $user = Auth::user();

    //     if (! $user->hasPermission('expense_accounts.edit')) {
    //         return redirect()->back()->with('error', 'Unauthorized access.');
    //     }

    //     $validated = $request->validate([
    //         'account_name' => ['required', 'string', 'max:255'],
    //         'description' => ['nullable', 'string'],
    //         'status' => ['required', 'boolean'],
    //     ]);

    //     // Authorization check
    //     if ($user->role_id === 3 && $expenseAccount->section_code !== $user->section_code) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     if ($user->role_id === 2 && $expenseAccount->company_code !== $user->company_code) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     try {
    //         DB::beginTransaction();
    //         $expenseAccount->update($validated);
    //         DB::commit();

    //         return redirect()->route('admin.expense-accounts.index')
    //             ->with('success', 'Expense account updated successfully.');
    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         return redirect()->back()
    //             ->withInput()
    //             ->with('error', 'Failed to update expense account: ' . $e->getMessage());
    //     }
    // }

    /**
     * Toggle active/inactive status for an expense account
     */
    // public function toggleStatus(ExpenseAccount $expenseAccount): RedirectResponse
    // {
    //     $expenseAccount->update([
    //         'status' => !$expenseAccount->status
    //     ]);

    //     return back()->with('success', $expenseAccount->status
    //         ? 'Expense account activated successfully!'
    //         : 'Expense account deactivated successfully!');
    // }

    /**
     * Remove the specified expense account from storage.
     */
    // public function destroy(ExpenseAccount $expenseAccount): RedirectResponse
    // {
    //     $user = Auth::user();

    //     if (! $user->hasPermission('expense_accounts.delete')) {
    //         return redirect()->back()->with('error', 'Unauthorized access.');
    //     }

    //     // Authorization check
    //     if ($user->role_id === 3 && $expenseAccount->section_code !== $user->section_code) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     if ($user->role_id === 2 && $expenseAccount->company_code !== $user->company_code) {
    //         abort(403, 'Unauthorized access.');
    //     }

    //     try {
    //         $expenseAccount->delete();

    //         return redirect()->route('admin.expense-accounts.index')
    //             ->with('success', 'Expense account deleted successfully.');

    //     } catch (\Exception $e) {
    //         return redirect()->back()
    //             ->with('error', 'Failed to delete expense account: ' . $e->getMessage());
    //     }
    // }
// }
