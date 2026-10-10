<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Models\CashReconciliation;
use App\Models\Company;
use App\Models\Section;
use App\Models\SalesTransaction;
use App\Models\CustomerPayment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;

class CashReconciliationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $company = $user->company ?? Company::first();
        $companyCode = $company->company_code ?? 'C01';

        $sections = Cache::remember("sections_{$companyCode}", 3600, function () use ($companyCode) {
            return Section::where('is_active', true)
                ->where('company_code', $companyCode)
                ->select('id', 'name', 'section_code')
                ->orderBy('name')
                ->get();
        });

        // Get users for the filter (only for admins) with caching
        $users = [];
        // role_id === 1: Super Admin, role_id === 2: Company Admin, role_id === 5: Company Admin (Malibo)
        $adminRoleIds = [1, 2, 5];
        $canViewAllUsers = in_array($user->role_id, $adminRoleIds, true);
        
        if ($canViewAllUsers) {
            $users = Cache::remember("users_{$companyCode}", 3600, function () use ($companyCode) {
                return DB::table('users')
                    ->where('company_code', $companyCode)
                    ->where('is_active', true)
                    ->select('id', 'username', 'first_name', 'last_name')
                    ->orderBy('first_name')
                    ->orderBy('last_name')
                    ->get()
                    ->map(function ($u) {
                        return [
                            'id' => $u->id,
                            'username' => $u->username,
                            'full_name' => trim($u->first_name . ' ' . $u->last_name),
                        ];
                    });
            });
        }

        return Inertia::render('Reports/CashReconciliation', [
            'sections' => $sections,
            'users' => $users,
            'currentUser' => [
                'id' => $user->id,
                'username' => $user->username,
                'full_name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
                'section_code' => $user->section_code ?? null,
                'can_view_all_users' => $canViewAllUsers,
            ],
            'filters' => $request->only(['date', 'section_code', 'user_id']),
            'initialData' => $this->getHistoryData($companyCode, null, null, null),
        ]);
    }

    public function getExpectedData(Request $request)
    {
        try {
            $user = Auth::user();
            $companyCode = $user->company_code ?? null;

            $date = $request->get('date', date('Y-m-d'));
            $sectionCode = $request->get('section_code');
            $requestedUserId = $request->get('user_id');

            if (!$sectionCode) {
                return response()->json(['error' => 'Please select a section.'], 400);
            }

            // Determine which user's data to reconcile
            // Admins (role 1, 2, or 5) can view any user's data if user_id is provided
            $targetUserId = $user->id;
            if ($requestedUserId && in_array($user->role_id, [1, 2, 5], true)) {
                $targetUserId = (int) $requestedUserId;
            }

            Log::info('Getting expected data for cash reconciliation', [
                'date' => $date,
                'section_code' => $sectionCode,
                'logged_in_user_id' => $user->id,
                'target_user_id' => $targetUserId,
                'company_code' => $companyCode
            ]);

            // Find last reconciliation date
            $lastReconciliationDate = CashReconciliation::where('user_id', $targetUserId)
                ->where('section_code', $sectionCode)
                ->where('company_code', $companyCode)
                ->whereDate('reconciliation_date', '<', $date)
                ->orderBy('reconciliation_date', 'desc')
                ->value('reconciliation_date');

            $applyDateRange = function ($query, $dateColumn = 'created_at') use ($date, $lastReconciliationDate) {
                $query->whereDate($dateColumn, '<=', $date);
                if ($lastReconciliationDate) {
                    $query->whereDate($dateColumn, '>', $lastReconciliationDate);
                }
            };

            // Get opening balance for target user since last reconciliation
            $openingBalanceQuery = DB::table('day_opening_balances')
                ->where('user_id', $targetUserId)
                ->where('company_code', $companyCode)
                ->where('section_code', $sectionCode);
            $applyDateRange($openingBalanceQuery, 'balance_date');
            $openingBalance = (float) $openingBalanceQuery->sum('opening_balance');

            // --- Sales Transactions ---
            $salesTransactionsQuery = SalesTransaction::where('cashier_id', $targetUserId)
                ->where('section_code', $sectionCode)
                ->whereNotNull('payment_details')
                ->whereIn('status', ['completed', 'partially_paid']);
            $applyDateRange($salesTransactionsQuery, 'transaction_date');
            $salesTransactions = $salesTransactionsQuery->get();

            $salesCash = 0;
            $salesCard = 0;
            $salesBank = 0;
            $salesCheque = 0;
            $salesCredit = 0;
            $salesCreditApplied = 0;

            foreach ($salesTransactions as $s) {
                $details = $s->payment_details ?? [];
                $cardAmt = (float)($details['card'] ?? 0);
                $chequeAmt = (float)($details['cheque'] ?? 0);
                $bankAmt = (float)($details['bank_transfer'] ?? 0);
                $creditAmt = (float)($details['credit'] ?? 0);
                $creditAppliedAmt = (float)($details['voucher'] ?? 0) + (float)($details['credit_applied'] ?? 0);
                
                $salesCard += $cardAmt;
                $salesCheque += $chequeAmt;
                $salesBank += $bankAmt;
                $salesCredit += $creditAmt;
                $salesCreditApplied += $creditAppliedAmt;
                
                $points = (float)($details['points'] ?? 0);
                $cashTendered = (float)($details['cash'] ?? 0);
                
                $otherPayments = $cardAmt + $chequeAmt + $bankAmt + $creditAmt + $creditAppliedAmt + $points;
                // Applied cash is what remains after other payments, capped by tendered cash
                $salesCash += min($cashTendered, max(0, (float)$s->total_amount - $otherPayments));
            }
            
            // Backward compatibility
            $cashSales = $salesCash;

            // --- Sales Returns ---
            $salesReturnsQuery = \App\Models\CustomerReturn::where('processed_by', $targetUserId);
            $applyDateRange($salesReturnsQuery, 'return_date');
            $salesReturns = (float) $salesReturnsQuery->sum('total_return_amount');

            // --- Customer Collections ---
            $customerPaymentsQuery = \App\Models\CustomerPayment::where('status', 'completed')
                ->where('collected_by', $targetUserId)
                ->where(function($q) {
                    $q->where('notes', 'not like', 'Initial % payment for sale')
                      ->where('notes', 'not like', 'Updated % payment for sale')
                      ->where('notes', 'not like', 'Credit balance applied toward sale %')
                      ->orWhereNull('notes');
                });
            $applyDateRange($customerPaymentsQuery, 'date');
            $customerPayments = $customerPaymentsQuery->get();

            $collectionsCash = (float) $customerPayments->where('method', 'cash')->sum('amount');
            $collectionsCard = (float) $customerPayments->where('method', 'card')->sum('amount');
            $collectionsBank = (float) $customerPayments->whereIn('method', ['bank', 'bank_transfer'])->sum('amount');
            $collectionsCheque = (float) $customerPayments->where('method', 'cheque')->sum('amount');
            $collectionsCreditApplied = (float) $customerPayments->where('method', 'applied_credit')->sum('amount');

            // --- Delivery Collections ---
            $deliveryPaymentsQuery = \App\Models\DeliveryPayment::where('status', 'cleared')
                ->where('recorded_by', $targetUserId);
            $applyDateRange($deliveryPaymentsQuery, 'payment_date');
            $deliveryPayments = $deliveryPaymentsQuery->get();

            $collectionsCash += (float) $deliveryPayments->where('method', 'cash')->sum('amount');
            $collectionsCard += (float) $deliveryPayments->where('method', 'card')->sum('amount');
            $collectionsBank += (float) $deliveryPayments->whereIn('method', ['bank', 'bank_transfer', 'transfer'])->sum('amount');
            $collectionsCheque += (float) $deliveryPayments->where('method', 'cheque')->sum('amount');

            // Backward compatibility
            $creditPayments = $collectionsCash;
            $cardPayments = $salesCard + $collectionsCard;
            $bankTransferPayments = $salesBank + $collectionsBank;
            $chequePayments = $salesCheque + $collectionsCheque;

            // --- Petty Cash Expenses ---
            $expensesQuery = DB::table('petty_cash_transactions')
                ->where('company_code', $companyCode)
                ->where('section_code', $sectionCode)
                ->where('created_by_id', $targetUserId);
            $applyDateRange($expensesQuery, 'transaction_date');
            $expenses = (float) $expensesQuery->sum('amount');

            $deliveryExpensesQuery = DB::table('delivery_petty_cash_transactions')
                ->where('company_code', $companyCode)
                ->where('section_code', $sectionCode)
                ->where('created_by_id', $targetUserId);
            $applyDateRange($deliveryExpensesQuery, 'transaction_date');
            $deliveryExpenses = (float) $deliveryExpensesQuery->sum('amount');

            $expenses += $deliveryExpenses;

            // --- Transfers ---
            $transfersQuery = \App\Models\FinanceVoucher::where('type', 'transfer')
                ->where('created_by_id', $targetUserId);
            $applyDateRange($transfersQuery, 'date');
            $transfers = (float) $transfersQuery->sum('amount');

            // Expected closing cash
            $expectedClosing = $openingBalance + $salesCash + $collectionsCash - $expenses;

            // Check if reconciliation already exists
            $existingReconciliation = CashReconciliation::where('company_code', $companyCode)
                ->where('section_code', $sectionCode)
                ->where('user_id', $targetUserId)
                ->where('reconciliation_date', $date)
                ->first();

            return response()->json([
                'opening_balance' => $existingReconciliation ? (float) $existingReconciliation->opening_balance : $openingBalance,
                'cash_sales' => $existingReconciliation ? (float) $existingReconciliation->cash_sales : $cashSales,
                'sales_cash' => $existingReconciliation ? (float) $existingReconciliation->sales_cash : $salesCash,
                'sales_card' => $existingReconciliation ? (float) $existingReconciliation->sales_card : $salesCard,
                'sales_bank' => $existingReconciliation ? (float) $existingReconciliation->sales_bank : $salesBank,
                'sales_cheque' => $existingReconciliation ? (float) $existingReconciliation->sales_cheque : $salesCheque,
                'sales_credit' => $existingReconciliation ? (float) $existingReconciliation->sales_credit : $salesCredit,
                'sales_credit_applied' => $existingReconciliation ? (float) $existingReconciliation->sales_credit_applied : $salesCreditApplied,
                'sales_returns' => $existingReconciliation ? (float) $existingReconciliation->sales_returns : $salesReturns,
                'credit_payments' => $existingReconciliation ? (float) $existingReconciliation->credit_payments : $creditPayments,
                'collections_cash' => $existingReconciliation ? (float) $existingReconciliation->collections_cash : $collectionsCash,
                'collections_card' => $existingReconciliation ? (float) $existingReconciliation->collections_card : $collectionsCard,
                'collections_bank' => $existingReconciliation ? (float) $existingReconciliation->collections_bank : $collectionsBank,
                'collections_cheque' => $existingReconciliation ? (float) $existingReconciliation->collections_cheque : $collectionsCheque,
                'collections_credit_applied' => $existingReconciliation ? (float) $existingReconciliation->collections_credit_applied : $collectionsCreditApplied,
                'transfers' => $existingReconciliation ? (float) $existingReconciliation->transfers : $transfers,
                'bbf' => $existingReconciliation ? (float) $existingReconciliation->bbf : $openingBalance,
                'expenses' => $existingReconciliation ? (float) $existingReconciliation->expenses : $expenses,
                'bank_transfer_payments' => $existingReconciliation ? (float) $existingReconciliation->bank_transfer_payments : $bankTransferPayments,
                'cheque_payments' => $existingReconciliation ? (float) $existingReconciliation->cheque_payments : $chequePayments,
                'card_payments' => $existingReconciliation ? (float) $existingReconciliation->card_payments : $cardPayments,
                'expected_closing' => $existingReconciliation ? (float) $existingReconciliation->expected_closing : $expectedClosing,
                'existing_reconciliation' => $existingReconciliation,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting expected data: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Failed to get expected data: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $user = Auth::user();
            $companyCode = $user->company_code ?? null;

            $validated = $request->validate([
                'section_code' => 'required|string|max:50',
                'reconciliation_date' => 'required|date',
                'user_id' => 'nullable|integer|exists:users,id',
                'notes_5000' => 'required|integer|min:0',
                'notes_2000' => 'required|integer|min:0',
                'notes_1000' => 'required|integer|min:0',
                'notes_500' => 'required|integer|min:0',
                'notes_100' => 'required|integer|min:0',
                'notes_50' => 'required|integer|min:0',
                'notes_20' => 'required|integer|min:0',
                'coins' => 'required|numeric|min:0',
                'actual_cash' => 'required|numeric',
                'opening_balance' => 'required|numeric',
                'cash_sales' => 'required|numeric',
                'sales_cash' => 'nullable|numeric',
                'sales_card' => 'nullable|numeric',
                'sales_bank' => 'nullable|numeric',
                'sales_cheque' => 'nullable|numeric',
                'sales_credit' => 'nullable|numeric',
                'sales_credit_applied' => 'nullable|numeric',
                'sales_returns' => 'nullable|numeric',
                'credit_payments' => 'required|numeric',
                'collections_cash' => 'nullable|numeric',
                'collections_card' => 'nullable|numeric',
                'collections_bank' => 'nullable|numeric',
                'collections_cheque' => 'nullable|numeric',
                'collections_credit_applied' => 'nullable|numeric',
                'expenses' => 'required|numeric',
                'bank_transfer_payments' => 'nullable|numeric',
                'cheque_payments' => 'nullable|numeric',
                'card_payments' => 'nullable|numeric',
                'transfers' => 'nullable|numeric',
                'bbf' => 'nullable|numeric',
                'actual_cheques' => 'nullable|integer|min:0',
                'actual_cheques_amount' => 'nullable|numeric',
                'expected_cheques' => 'nullable|numeric',
                'cheque_variance' => 'nullable|numeric',
                'expected_closing' => 'required|numeric',
                'variance' => 'required|numeric',
                'notes' => 'nullable|string|max:1000',
            ]);

            // Determine target user (admin can reconcile for other users)
            $targetUserId = $user->id;
            
            if (isset($validated['user_id']) && in_array($user->role_id, [1, 2, 5], true)) {
                $targetUserId = $validated['user_id'];
            }
            
            // Always fetch fresh user data to ensure username is loaded
            $targetUser = \App\Models\User::find($targetUserId);
            if (!$targetUser) {
                return response()->json(['error' => 'Target user not found.'], 404);
            }
            
            // Use username if available, otherwise fall back to email (username field is now nullable)
            $targetUsername = $targetUser->username ?: $targetUser->email;

            // Check if reconciliation already exists
            $existing = CashReconciliation::where('company_code', $companyCode)
                ->where('section_code', $validated['section_code'])
                ->where('user_id', $targetUserId)
                ->where('reconciliation_date', $validated['reconciliation_date'])
                ->first();

            if ($existing) {
                return response()->json([
                    'error' => 'Cash reconciliation for this date already exists. Please delete the existing one first.'
                ], 422);
            }

            // Determine status based on variance
            $status = 'pending';
            $variance = (float) $validated['variance'];
            
            if (abs($variance) < 0.01) {
                $status = 'balanced';
            } elseif (abs($variance) > 1000) {
                $status = 'flagged'; // Large discrepancy needs review
            }

            $reconciliation = CashReconciliation::create([
                'company_code' => $companyCode,
                'section_code' => $validated['section_code'],
                'user_id' => $targetUserId,
                'username' => $targetUsername,
                'reconciliation_date' => $validated['reconciliation_date'],
                'notes_5000' => $validated['notes_5000'],
                'notes_2000' => $validated['notes_2000'],
                'notes_1000' => $validated['notes_1000'],
                'notes_500' => $validated['notes_500'],
                'notes_100' => $validated['notes_100'],
                'notes_50' => $validated['notes_50'],
                'notes_20' => $validated['notes_20'],
                'coins' => $validated['coins'],
                'actual_cash' => $validated['actual_cash'],
                'opening_balance' => $validated['opening_balance'],
                'cash_sales' => $validated['cash_sales'],
                'sales_cash' => $validated['sales_cash'] ?? 0,
                'sales_card' => $validated['sales_card'] ?? 0,
                'sales_bank' => $validated['sales_bank'] ?? 0,
                'sales_cheque' => $validated['sales_cheque'] ?? 0,
                'sales_credit' => $validated['sales_credit'] ?? 0,
                'sales_credit_applied' => $validated['sales_credit_applied'] ?? 0,
                'sales_returns' => $validated['sales_returns'] ?? 0,
                'credit_payments' => $validated['credit_payments'],
                'collections_cash' => $validated['collections_cash'] ?? 0,
                'collections_card' => $validated['collections_card'] ?? 0,
                'collections_bank' => $validated['collections_bank'] ?? 0,
                'collections_cheque' => $validated['collections_cheque'] ?? 0,
                'collections_credit_applied' => $validated['collections_credit_applied'] ?? 0,
                'expenses' => $validated['expenses'],
                'bank_transfer_payments' => $validated['bank_transfer_payments'] ?? 0,
                'cheque_payments' => $validated['cheque_payments'] ?? 0,
                'card_payments' => $validated['card_payments'] ?? 0,
                'transfers' => $validated['transfers'] ?? 0,
                'bbf' => $validated['bbf'] ?? $validated['opening_balance'],
                'actual_cheques' => $validated['actual_cheques'] ?? 0,
                'actual_cheques_amount' => $validated['actual_cheques_amount'] ?? 0,
                'expected_cheques' => $validated['expected_cheques'] ?? 0,
                'cheque_variance' => $validated['cheque_variance'] ?? 0,
                'expected_closing' => $validated['expected_closing'],
                'variance' => $validated['variance'],
                'notes' => $validated['notes'],
                'status' => $status,
            ]);

            Log::info('Cash reconciliation created', [
                'id' => $reconciliation->id,
                'variance' => $variance,
                'status' => $status
            ]);

            // Update Main Cash Account
            $netCashDeposited = (float)($validated['transfers'] ?? 0);
            
            if ($netCashDeposited != 0) {
                // Update Main Cash Account (Receiving the transfer)
                $cashFinanceAccount = \App\Models\FinanceAccount::where('account_type', 'cash')
                    ->where('company_code', $companyCode)
                    ->lockForUpdate()
                    ->first();
                
                if ($cashFinanceAccount) {
                    $cashFinanceAccount->current_balance = (float)$cashFinanceAccount->current_balance + $netCashDeposited;
                    $cashFinanceAccount->save();
                    
                    \App\Models\FinanceAccountTransaction::create([
                        'finance_account_id' => $cashFinanceAccount->id,
                        'date' => now(),
                        'source_type' => 'Cash Reconciliation',
                        'source_id' => $reconciliation->id,
                        'description' => 'End of Shift - ' . $targetUsername . ' (Variance: ' . $variance . ')',
                        'method' => 'cash',
                        'type' => $netCashDeposited > 0 ? 'debit' : 'credit',
                        'amount' => abs($netCashDeposited),
                        'reference' => (string) $reconciliation->id,
                    ]);
                }

                // Update Cashier Sales Account (Sending the transfer)
                $cashierFinanceAccount = \App\Models\FinanceAccount::where('account_name', 'like', '%Cashier Sales%')
                    ->where('section_code', $validated['section_code'])
                    ->first() ?? \App\Models\FinanceAccount::find(40);
                    
                if ($cashierFinanceAccount) {
                    if (in_array($cashierFinanceAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                        $cashierFinanceAccount->current_balance += $netCashDeposited; // Transfer out means credit, which increases liability
                    } else {
                        $cashierFinanceAccount->current_balance -= $netCashDeposited; // Transfer out means credit, which decreases asset
                    }
                    $cashierFinanceAccount->save();
                    
                    \App\Models\FinanceAccountTransaction::create([
                        'finance_account_id' => $cashierFinanceAccount->id,
                        'date' => now(),
                        'source_type' => 'Cash Reconciliation',
                        'source_id' => $reconciliation->id,
                        'description' => 'Transfer Outward (End of Shift) - ' . $targetUsername,
                        'method' => 'cash',
                        'type' => $netCashDeposited > 0 ? 'credit' : 'debit', // Opposite of Main Cash Account
                        'amount' => abs($netCashDeposited),
                        'reference' => (string) $reconciliation->id,
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Cash reconciliation saved successfully.',
                'reconciliation' => $reconciliation,
            ]);
        } catch (\Exception $e) {
            Log::error('Error saving cash reconciliation: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Failed to save reconciliation: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = Auth::user();
            $companyCode = $user->company_code ?? null;

            if (!in_array($user->role_id, [1, 2, 5], true)) {
                return response()->json(['error' => 'Unauthorized.'], 403);
            }

            $reconciliation = CashReconciliation::where('company_code', $companyCode)
                ->findOrFail($id);

            $validated = $request->validate([
                'section_code' => 'required|string|max:50',
                'reconciliation_date' => 'required|date',
                'user_id' => 'nullable|integer|exists:users,id',
                'notes_5000' => 'required|integer|min:0',
                'notes_2000' => 'required|integer|min:0',
                'notes_1000' => 'required|integer|min:0',
                'notes_500' => 'required|integer|min:0',
                'notes_100' => 'required|integer|min:0',
                'notes_50' => 'required|integer|min:0',
                'notes_20' => 'required|integer|min:0',
                'coins' => 'required|numeric|min:0',
                'actual_cash' => 'required|numeric',
                'opening_balance' => 'required|numeric',
                'cash_sales' => 'required|numeric',
                'sales_cash' => 'nullable|numeric',
                'sales_card' => 'nullable|numeric',
                'sales_bank' => 'nullable|numeric',
                'sales_cheque' => 'nullable|numeric',
                'sales_credit' => 'nullable|numeric',
                'sales_credit_applied' => 'nullable|numeric',
                'sales_returns' => 'nullable|numeric',
                'credit_payments' => 'required|numeric',
                'collections_cash' => 'nullable|numeric',
                'collections_card' => 'nullable|numeric',
                'collections_bank' => 'nullable|numeric',
                'collections_cheque' => 'nullable|numeric',
                'collections_credit_applied' => 'nullable|numeric',
                'expenses' => 'required|numeric',
                'bank_transfer_payments' => 'nullable|numeric',
                'cheque_payments' => 'nullable|numeric',
                'card_payments' => 'nullable|numeric',
                'transfers' => 'nullable|numeric',
                'bbf' => 'nullable|numeric',
                'actual_cheques' => 'nullable|integer|min:0',
                'actual_cheques_amount' => 'nullable|numeric',
                'expected_cheques' => 'nullable|numeric',
                'cheque_variance' => 'nullable|numeric',
                'expected_closing' => 'required|numeric',
                'variance' => 'required|numeric',
                'notes' => 'nullable|string|max:1000',
            ]);

            $validatedDate = Carbon::parse($validated['reconciliation_date'])->toDateString();
            $reconciliationDate = $reconciliation->reconciliation_date->toDateString();

            if (
                $validated['section_code'] !== $reconciliation->section_code ||
                $validatedDate !== $reconciliationDate
            ) {
                return response()->json(['error' => 'Section or date mismatch for this reconciliation.'], 422);
            }

            $variance = (float) $validated['variance'];
            $status = 'pending';
            if (abs($variance) < 0.01) {
                $status = 'balanced';
            } elseif (abs($variance) > 1000) {
                $status = 'flagged';
            }

            $oldNetCashDeposited = (float)($reconciliation->transfers ?? 0);

            $reconciliation->update([
                'notes_5000' => $validated['notes_5000'],
                'notes_2000' => $validated['notes_2000'],
                'notes_1000' => $validated['notes_1000'],
                'notes_500' => $validated['notes_500'],
                'notes_100' => $validated['notes_100'],
                'notes_50' => $validated['notes_50'],
                'notes_20' => $validated['notes_20'],
                'coins' => $validated['coins'],
                'actual_cash' => $validated['actual_cash'],
                'opening_balance' => $validated['opening_balance'],
                'cash_sales' => $validated['cash_sales'],
                'sales_cash' => $validated['sales_cash'] ?? 0,
                'sales_card' => $validated['sales_card'] ?? 0,
                'sales_bank' => $validated['sales_bank'] ?? 0,
                'sales_cheque' => $validated['sales_cheque'] ?? 0,
                'sales_credit' => $validated['sales_credit'] ?? 0,
                'sales_credit_applied' => $validated['sales_credit_applied'] ?? 0,
                'sales_returns' => $validated['sales_returns'] ?? 0,
                'credit_payments' => $validated['credit_payments'],
                'collections_cash' => $validated['collections_cash'] ?? 0,
                'collections_card' => $validated['collections_card'] ?? 0,
                'collections_bank' => $validated['collections_bank'] ?? 0,
                'collections_cheque' => $validated['collections_cheque'] ?? 0,
                'collections_credit_applied' => $validated['collections_credit_applied'] ?? 0,
                'expenses' => $validated['expenses'],
                'bank_transfer_payments' => $validated['bank_transfer_payments'] ?? 0,
                'cheque_payments' => $validated['cheque_payments'] ?? 0,
                'card_payments' => $validated['card_payments'] ?? 0,
                'transfers' => $validated['transfers'] ?? 0,
                'bbf' => $validated['bbf'] ?? $validated['opening_balance'],
                'actual_cheques' => $validated['actual_cheques'] ?? 0,
                'actual_cheques_amount' => $validated['actual_cheques_amount'] ?? 0,
                'expected_cheques' => $validated['expected_cheques'] ?? 0,
                'cheque_variance' => $validated['cheque_variance'] ?? 0,
                'expected_closing' => $validated['expected_closing'],
                'variance' => $validated['variance'],
                'notes' => $validated['notes'],
                'status' => $status,
            ]);

            Log::info('Cash reconciliation updated', [
                'id' => $reconciliation->id,
                'variance' => $variance,
                'status' => $status
            ]);

            $newNetCashDeposited = (float)($validated['transfers'] ?? 0);
            $cashDifference = $newNetCashDeposited - $oldNetCashDeposited;

            if ($cashDifference != 0) {
                $cashFinanceAccount = \App\Models\FinanceAccount::where('account_type', 'cash')
                    ->where('company_code', $companyCode)
                    ->lockForUpdate()
                    ->first();
                
                if ($cashFinanceAccount) {
                    $cashFinanceAccount->current_balance = (float)$cashFinanceAccount->current_balance + $cashDifference;
                    $cashFinanceAccount->save();
                    
                    \App\Models\FinanceAccountTransaction::create([
                        'finance_account_id' => $cashFinanceAccount->id,
                        'date' => now(),
                        'source_type' => 'Cash Reconciliation Update',
                        'source_id' => $reconciliation->id,
                        'description' => 'Reconciliation update cash adjustment',
                        'method' => 'cash',
                        'type' => $cashDifference > 0 ? 'debit' : 'credit',
                        'amount' => abs($cashDifference),
                        'reference' => (string) $reconciliation->id,
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Cash reconciliation updated successfully.',
                'reconciliation' => $reconciliation->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating cash reconciliation: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Failed to update reconciliation: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $user = Auth::user();
            $companyCode = $user->company_code ?? null;

            if (!in_array($user->role_id, [1, 2, 5], true)) {
                return response()->json(['error' => 'Unauthorized.'], 403);
            }

            $reconciliation = CashReconciliation::where('company_code', $companyCode)
                ->findOrFail($id);

            $netCashDeposited = (float)($reconciliation->transfers ?? 0);

            $reconciliation->delete();

            if ($netCashDeposited != 0) {
                $cashFinanceAccount = \App\Models\FinanceAccount::where('account_type', 'cash')
                    ->where('company_code', $companyCode)
                    ->lockForUpdate()
                    ->first();
                
                if ($cashFinanceAccount) {
                    $cashFinanceAccount->current_balance = (float)$cashFinanceAccount->current_balance - $netCashDeposited;
                    $cashFinanceAccount->save();
                    
                    \App\Models\FinanceAccountTransaction::create([
                        'finance_account_id' => $cashFinanceAccount->id,
                        'date' => now(),
                        'source_type' => 'Cash Reconciliation Delete',
                        'source_id' => $id,
                        'description' => 'Reconciliation deleted cash reversal',
                        'method' => 'cash',
                        'type' => $netCashDeposited > 0 ? 'credit' : 'debit',
                        'amount' => abs($netCashDeposited),
                        'reference' => (string) $id,
                    ]);
                }
            }

            Log::info('Cash reconciliation deleted', [
                'id' => $id,
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cash reconciliation deleted successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting cash reconciliation: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Failed to delete reconciliation: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $reconciliation = CashReconciliation::with(['user', 'section', 'company'])
                ->findOrFail($id);

            return response()->json($reconciliation);
        } catch (\Exception $e) {
            Log::error('Error fetching reconciliation: ' . $e->getMessage());
            return response()->json(['error' => 'Reconciliation not found.'], 404);
        }
    }

    public function downloadPdf(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company ?? Company::first();
            $section = $user->section ?? Section::first();

            $reconciliationId = $request->get('reconciliation_id');

            if (!$reconciliationId) {
                return back()->with('error', 'Reconciliation ID is required.');
            }

            $reconciliation = CashReconciliation::with(['user', 'section'])->findOrFail($reconciliationId);

            $companyInfo = [
                'name' => $company ? ($company->name ?? 'Company') : 'Company',
                'section' => $reconciliation->section ? $reconciliation->section->name : 'Section',
                'code' => $reconciliation->company_code,
                'section_code' => $reconciliation->section_code,
            ];

            $pdfData = [
                'reportTitle' => 'Cash Reconciliation Report',
                'company' => $companyInfo,
                'reconciliation' => $reconciliation,
                'generated_at' => now()->format('Y-m-d H:i:s'),
                'generated_by' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: 'System User',
            ];

            $pdf = Pdf::loadView('reports.cash-reconciliation-pdf', $pdfData);
            // Custom paper size for 80mm POS printers (226pt x 800pt)
            $pdf->setPaper([0, 0, 226, 800], 'portrait');
            $pdf->setOptions([
                'isHtml5ParserEnabled' => true,
                'isPhpEnabled' => true,
                'defaultFont' => 'DejaVu Sans'
            ]);

            $filename = 'cash-reconciliation-' . $reconciliation->reconciliation_date->format('Y-m-d') . 
                        '-' . ($reconciliation->username ?: 'user') . '.pdf';

            return $pdf->download($filename);
        } catch (\Exception $e) {
            Log::error('Cash Reconciliation PDF Error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Error generating PDF: ' . $e->getMessage()], 500);
        }
    }

    public function export(Request $request)
    {
        try {
            $user = Auth::user();
            $companyCode = $user->company_code ?? null;

            $data = $this->getHistoryData(
                $companyCode, 
                $request->get('section_code'), 
                $request->get('user_id'), 
                $request->get('status')
            );

            $csvRows = [];
            $csvRows[] = ['Cash Reconciliation History'];
            $csvRows[] = ['Date Generated', now()->format('Y-m-d H:i:s')];
            $csvRows[] = [];
            $csvRows[] = [
                'Reconciliation Date', 
                'Section', 
                'Cashier', 
                'Expected Closing', 
                'Actual Cash', 
                'Variance', 
                'Status', 
                'Notes'
            ];

            foreach ($data as $row) {
                $csvRows[] = [
                    $row->reconciliation_date->format('Y-m-d'),
                    $row->section_code,
                    $row->username,
                    number_format($row->expected_closing, 2, '.', ''),
                    number_format($row->actual_cash, 2, '.', ''),
                    number_format($row->variance, 2, '.', ''),
                    ucfirst($row->status),
                    $row->notes
                ];
            }

            $filename = 'cash_reconciliation_history_' . date('Ymd_His') . '.csv';
            
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"$filename\"",
            ];

            $callback = function() use ($csvRows) {
                $file = fopen('php://output', 'w');
                foreach ($csvRows as $row) {
                    fputcsv($file, $row);
                }
                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            Log::error('Error exporting cash reconciliation: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to export data.'], 500);
        }
    }

    public function history(Request $request)
    {
        try {
            $user = Auth::user();
            $companyCode = $user->company_code ?? null;

            $data = $this->getHistoryData($companyCode, $request->section_code, $request->user_id, $request->status);

            return response()->json(['data' => $data]);
        } catch (\Exception $e) {
            Log::error('Error fetching reconciliation history: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to load history.'], 500);
        }
    }

    private function getHistoryData($companyCode, $sectionCode, $userId, $status)
    {
        $query = CashReconciliation::with(['user', 'section'])
            ->where('company_code', $companyCode);

        if ($sectionCode) {
            $query->where('section_code', $sectionCode);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        return $query->orderBy('reconciliation_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit(50) // Load first 50 for initial data
            ->get();
    }
}
