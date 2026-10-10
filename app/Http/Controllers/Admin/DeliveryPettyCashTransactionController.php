<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryPettyCashCategory;
use App\Models\DeliveryPettyCashTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeliveryPettyCashTransactionController extends Controller
{
    // public function index(Request $request)
    // {
    //     if (! request()->user()->hasPermission('delivery_petty_cash.view')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }

    //     $baseQuery = DeliveryPettyCashTransaction::query();
    //     if ($user = $request->user()) {
    //         if ($user->role_id !== 1) {
    //             if ($user->role_id === 3) {
    //                 $baseQuery->where('section_code', $user->section_code);
    //             } else {
    //                 $baseQuery->where('company_code', $user->company_code);
    //             }
    //         }
    //     }

    //     // Global Available Balance (ignoring date/search filters)
    //     $globalReceived = (float) (clone $baseQuery)->received()->sum('amount');
    //     $globalUsage = (float) (clone $baseQuery)->usage()->sum('amount');
    //     $globalAvailableBalance = round($globalReceived - $globalUsage, 2);

    //     // Opening Balance (before from_date)
    //     $openingBalance = 0;
    //     if ($request->from_date) {
    //         $priorReceived = (float) (clone $baseQuery)
    //             ->whereDate('transaction_date', '<', $request->from_date)
    //             ->received()->sum('amount');
    //         $priorUsage = (float) (clone $baseQuery)
    //             ->whereDate('transaction_date', '<', $request->from_date)
    //             ->usage()->sum('amount');
    //         $openingBalance = $priorReceived - $priorUsage;
    //     }

    //     // Filtered Query
    //     $query = clone $baseQuery;

    //     if ($request->search) {
    //         $query->where(function ($q) use ($request) {
    //             $q->where('notes', 'like', "%{$request->search}%")
    //                 ->orWhereHas('category', function ($cat) use ($request) {
    //                     $cat->where('name', 'like', "%{$request->search}%");
    //                 });
    //         });
    //     }

    //     if ($request->category_id) {
    //         $query->where('delivery_petty_cash_category_id', $request->category_id);
    //     }

    //     if ($request->type && in_array($request->type, ['received', 'usage'])) {
    //         $query->where('type', $request->type);
    //     }

    //     if ($request->from_date) {
    //         $query->whereDate('transaction_date', '>=', $request->from_date);
    //     }

    //     if ($request->to_date) {
    //         $query->whereDate('transaction_date', '<=', $request->to_date);
    //     }

    //     // Ledger with cumulative balance
    //     $rawTransactions = (clone $query)
    //         ->with('category')
    //         ->orderBy('transaction_date', 'asc')
    //         ->orderBy('id', 'asc')
    //         ->get();

    //     $ledgerWithBalance = collect();
    //     $balance = $openingBalance;

    //     // Add opening balance / B/F as the first item
    //     $ledgerWithBalance->push([
    //         'id' => 'OB-0',
    //         'transaction_no' => '-',
    //         'transaction_date' => $request->from_date ? $request->from_date . ' 00:00:00' : (\Carbon\Carbon::parse('1970-01-01')->format('Y-m-d H:i:s')),
    //         'notes' => $request->from_date ? 'Opening Balance ' : 'Brought Forward Balance',
    //         'type' => 'received',
    //         'amount' => $openingBalance,
    //         'balance' => round($balance, 2),
    //         'delivery_petty_cash_category_id' => null,
    //         'category' => null,
    //         'slip_path' => null,
    //     ]);

    //     foreach ($rawTransactions as $t) {
    //         $amt = (float) $t->amount;
    //         if ($t->type === 'received') {
    //             $balance += $amt;
    //         } else {
    //             $balance -= $amt;
    //         }
    //         $data = $t->toArray();
    //         $data['balance'] = round($balance, 2);
    //         $ledgerWithBalance->push($data);
    //     }

    //     // Stats for the filtered period
    //     $cashReceived = (float) (clone $query)->received()->sum('amount');
    //     $totalUsage = (float) (clone $query)->usage()->sum('amount');
    //     $receivedCount = (clone $query)->received()->count();
    //     $usageCount = (clone $query)->usage()->count();
    //     $availableBalance = $globalAvailableBalance;

    //     // Breakdown by category (usage only, but lists every active category)
    //     $usageTransactions = (clone $query)->usage()->with('category')->get();

    //     $categoryQuery = DeliveryPettyCashCategory::active();
    //     if ($user = $request->user()) {
    //         if ($user->role_id !== 1) {
    //             if ($user->role_id === 3) {
    //                 $categoryQuery->where('section_code', $user->section_code);
    //             } else {
    //                 $categoryQuery->where('company_code', $user->company_code);
    //             }
    //         }
    //     }
    //     $allCategories = $categoryQuery->orderBy('name')->get();

    //     $byCategory = $allCategories->map(function ($cat) use ($usageTransactions) {
    //         $group = $usageTransactions->where('delivery_petty_cash_category_id', $cat->id);
    //         return [
    //             'category_id' => $cat->id,
    //             'category_name' => $cat->name,
    //             'usage_count' => $group->count(),
    //             'total' => round($group->sum('amount'), 2),
    //         ];
    //     })->sortByDesc('total')->values();

    //     $latestTx = DeliveryPettyCashTransaction::latest('id')->first();
    //     $nextTxNo = 'DPC-' . str_pad(($latestTx ? $latestTx->id + 1 : 1), 4, '0', STR_PAD_LEFT);

    //     return Inertia::render('admin/DeliveryPettyCashTransactions/Index', [
    //         'next_transaction_no' => $nextTxNo,
    //         'transactions' => $ledgerWithBalance->values(),
    //         'stats' => [
    //             'cash_received' => $cashReceived,
    //             'total_usage' => $totalUsage,
    //             'received_count' => $receivedCount,
    //             'usage_count' => $usageCount,
    //             'available_balance' => $availableBalance,
    //         ],
    //         'by_category' => $byCategory,
    //         'categories' => $allCategories,
    //         'filters' => $request->only(['search', 'category_id', 'type', 'from_date', 'to_date']),
    //     ]);
    // }

    // public function store(Request $request)
    // {
    //     if (! request()->user()->hasPermission('delivery_petty_cash.create')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }
    //     $data = $request->validate([
    //         'type' => 'nullable|in:received,usage',
    //         'delivery_petty_cash_category_id' => 'nullable|exists:delivery_petty_cash_categories,id',
    //         'amount' => 'required|numeric|min:0.01',
    //         'transaction_date' => 'required|date',
    //         'notes' => 'nullable|string',
    //         'slip' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
    //     ]);

    //     $data['type'] = $data['type'] ?? 'usage';

    //     if ($data['type'] === 'usage' && empty($data['delivery_petty_cash_category_id'])) {
    //         return redirect()->back()->withErrors(['delivery_petty_cash_category_id' => 'A delivery petty cash category is required for usage transactions.']);
    //     }

    //     if ($data['type'] === 'received') {
    //         $data['delivery_petty_cash_category_id'] = null;
    //     }

    //     if ($user = $request->user()) {
    //         $data['company_code'] = $user->company_code;
    //         $data['section_code'] = $user->section_code;
    //         $data['created_by_id'] = $user->id;
    //     }

    //     if ($request->hasFile('slip')) {
    //         $data['slip_path'] = $request->file('slip')->store('delivery_petty_cash_slips', 'public');
    //     }
    //     unset($data['slip']);

    //     \Illuminate\Support\Facades\DB::transaction(function () use ($data, $request) {
    //         $delPettyCashAccount = \App\Models\FinanceAccount::where('company_code', $data['company_code'])
    //             ->where('account_type', 'delivery_petty_cash')
    //             ->lockForUpdate()
    //             ->first();

    //         if ($delPettyCashAccount) {
    //             $data['finance_account_id'] = $delPettyCashAccount->id;
    //         }

    //         $transaction = DeliveryPettyCashTransaction::create($data);
    //         $transaction->transaction_no = 'DPC-' . str_pad($transaction->id, 4, '0', STR_PAD_LEFT);
    //         $transaction->save();

    //         if ($transaction->type === 'received') {
    //             $mainCashAccount = \App\Models\FinanceAccount::where('company_code', $data['company_code'])
    //                 ->where('account_type', 'cash')
    //                 ->lockForUpdate()
    //                 ->first();
                
    //             if ($mainCashAccount) {
    //                 // Deduct from Main Cash
    //                 $mainCashAccount->current_balance -= (float) $transaction->amount;
    //                 $mainCashAccount->save();
                    
    //                 \App\Models\FinanceAccountTransaction::create([
    //                     'finance_account_id' => $mainCashAccount->id,
    //                     'date' => $transaction->transaction_date,
    //                     'source_type' => 'Delivery Petty Cash Reimbursement',
    //                     'source_id' => $transaction->id,
    //                     'description' => 'Delivery Petty Cash Reimbursement (Transfer Out)',
    //                     'method' => 'cash',
    //                     'type' => 'credit',
    //                     'amount' => (float) $transaction->amount,
    //                     'reference' => $transaction->transaction_no,
    //                 ]);
    //             }

    //             if ($delPettyCashAccount) {
    //                 // Add to Delivery Petty Cash
    //                 $delPettyCashAccount->current_balance += (float) $transaction->amount;
    //                 $delPettyCashAccount->save();

    //                 \App\Models\FinanceAccountTransaction::create([
    //                     'finance_account_id' => $delPettyCashAccount->id,
    //                     'date' => $transaction->transaction_date,
    //                     'source_type' => 'Delivery Petty Cash Reimbursement',
    //                     'source_id' => $transaction->id,
    //                     'description' => $transaction->notes ?? 'Delivery Petty Cash Reimbursement (Transfer In)',
    //                     'method' => 'delivery_petty_cash',
    //                     'type' => 'debit',
    //                     'amount' => (float) $transaction->amount,
    //                     'reference' => $transaction->transaction_no,
    //                 ]);
                    
    //                 if ($mainCashAccount) {
    //                     // Create Finance Voucher
    //                     $latestVoucher = \App\Models\FinanceVoucher::latest('id')->first();
    //                     $lastNo = 0;
    //                     if ($latestVoucher) {
    //                         $lastNo = intval(preg_replace('/[^0-9]/', '', $latestVoucher->finance_voucher_no));
    //                     }
    //                     $voucherNo = 'FV-' . str_pad($lastNo + 1, 4, '0', STR_PAD_LEFT);

    //                     \App\Models\FinanceVoucher::create([
    //                         'finance_voucher_no' => $voucherNo,
    //                         'type' => 'withdraw',
    //                         'date' => $transaction->transaction_date,
    //                         'payer_account' => $mainCashAccount->account_name,
    //                         'description' => $transaction->notes ?? 'Delivery Petty Cash Reimbursement',
    //                         'amount' => $transaction->amount,
    //                         'company_code' => $data['company_code'] ?? null,
    //                         'section_code' => $data['section_code'] ?? null,
    //                         'created_by_id' => $data['created_by_id'] ?? null,
    //                         'finance_account_id' => $mainCashAccount->id,
    //                         'to_finance_account_id' => $delPettyCashAccount->id,
    //                         'slip_path' => $transaction->slip_path ?? null,
    //                     ]);
    //                 }
    //             }
    //         } else {
    //             if ($delPettyCashAccount) {
    //                 // Deduct Usage from Delivery Petty Cash
    //                 $delPettyCashAccount->current_balance -= (float) $transaction->amount;
    //                 $delPettyCashAccount->save();

    //                 \App\Models\FinanceAccountTransaction::create([
    //                     'finance_account_id' => $delPettyCashAccount->id,
    //                     'date' => $transaction->transaction_date,
    //                     'source_type' => 'Delivery Petty Cash Usage',
    //                     'source_id' => $transaction->id,
    //                     'description' => $transaction->notes ?? 'Delivery Petty Cash Usage',
    //                     'method' => 'delivery_petty_cash',
    //                     'type' => 'credit',
    //                     'amount' => (float) $transaction->amount,
    //                     'reference' => $transaction->transaction_no,
    //                 ]);
    //             }
    //         }
    //     });

    //     return redirect()->route('admin.delivery-petty-cash-transactions.index')->with('success', 'Delivery petty cash ' . ($data['type'] === 'received' ? 'reimbursement' : 'usage') . ' recorded.');
    // }

    // public function destroy(DeliveryPettyCashTransaction $delivery_petty_cash_transaction)
    // {
    //     if (! request()->user()->hasPermission('delivery_petty_cash.delete')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }

    //     \Illuminate\Support\Facades\DB::transaction(function () use ($delivery_petty_cash_transaction) {
    //         if ($delivery_petty_cash_transaction->type === 'received') {
    //             $mainCashAccount = \App\Models\FinanceAccount::where('company_code', $delivery_petty_cash_transaction->company_code)
    //                 ->where('account_type', 'cash')
    //                 ->lockForUpdate()
    //                 ->first();
                
    //             if ($mainCashAccount) {
    //                 // Refund Main Cash
    //                 $mainCashAccount->current_balance += (float) $delivery_petty_cash_transaction->amount;
    //                 $mainCashAccount->save();
                    
    //                 \App\Models\FinanceAccountTransaction::create([
    //                     'finance_account_id' => $mainCashAccount->id,
    //                     'date' => now(),
    //                     'source_type' => 'Delivery Petty Cash Reimbursement reversed',
    //                     'source_id' => $delivery_petty_cash_transaction->id,
    //                     'description' => 'Delivery Petty Cash Reimbursement reversed (Refund)',
    //                     'method' => 'cash',
    //                     'type' => 'debit',
    //                     'amount' => (float) $delivery_petty_cash_transaction->amount,
    //                     'reference' => 'N/A',
    //                 ]);
    //             }

    //             $delPettyCashAccount = \App\Models\FinanceAccount::where('id', $delivery_petty_cash_transaction->finance_account_id)
    //                 ->lockForUpdate()
    //                 ->first();

    //             if ($delPettyCashAccount) {
    //                 // Deduct from Delivery Petty Cash
    //                 $delPettyCashAccount->current_balance -= (float) $delivery_petty_cash_transaction->amount;
    //                 $delPettyCashAccount->save();

    //                 \App\Models\FinanceAccountTransaction::create([
    //                     'finance_account_id' => $delPettyCashAccount->id,
    //                     'date' => now(),
    //                     'source_type' => 'Delivery Petty Cash Reimbursement reversed',
    //                     'source_id' => $delivery_petty_cash_transaction->id,
    //                     'description' => 'Delivery Petty Cash Reimbursement reversed',
    //                     'method' => 'delivery_petty_cash',
    //                     'type' => 'credit',
    //                     'amount' => (float) $delivery_petty_cash_transaction->amount,
    //                     'reference' => 'N/A',
    //                 ]);
    //             }
    //         } else {
    //             $delPettyCashAccount = \App\Models\FinanceAccount::where('id', $delivery_petty_cash_transaction->finance_account_id)
    //                 ->lockForUpdate()
    //                 ->first();
                
    //             if ($delPettyCashAccount) {
    //                 // Refund the usage
    //                 $delPettyCashAccount->current_balance += (float) $delivery_petty_cash_transaction->amount;
    //                 $delPettyCashAccount->save();
                    
    //                 \App\Models\FinanceAccountTransaction::create([
    //                     'finance_account_id' => $delPettyCashAccount->id,
    //                     'date' => now(),
    //                     'source_type' => 'Delivery Petty Cash Usage Reversed',
    //                     'source_id' => $delivery_petty_cash_transaction->id,
    //                     'description' => 'Delivery Petty Cash Usage Reversed',
    //                     'method' => 'delivery_petty_cash',
    //                     'type' => 'debit',
    //                     'amount' => (float) $delivery_petty_cash_transaction->amount,
    //                     'reference' => 'N/A',
    //                 ]);
    //             }
    //         }
            
    //         $delivery_petty_cash_transaction->delete();
    //     });

    //     return redirect()->back()->with('success', 'Transaction removed.');
    // }
}
