<?php

namespace App\Http\Controllers\Reports;

use App\Models\CustomerPayment;
use App\Models\DayOpeningBalance;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CashCollectionReportController extends Controller
{
    public function index(Request $request)
    {
        // authorization guard – new permission slug added in PermissionSeeder
        if (! request()->user() || ! request()->user()->hasPermission('reports.cash_collection')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view cash collection reports.');
        }

        $user = Auth::user();
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth()->format('Y-m-d'));
        $cashierId = $request->get('cashier_id');
        $sectionCode = $request->get('section_code');

        // only cash customer payments; supplier payments handled separately later
        $paymentsQuery = CustomerPayment::with(['customer','serviceJob','salesTransaction'])
            ->whereBetween('date', [$startDate, $endDate])
            ->where('method', 'cash');

        // supplier payments query (cash going out) for ledger
        $supplierQuery = \App\Models\SupplierPayment::query()
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->where('payment_method', 'Cash');

        // apply role-based company restriction to all base queries
        if (!$user->isSuperAdmin()) {
            $paymentsQuery->whereHas('collectedBy', fn($q) => 
                $q->where('company_code', $user->company_code)
            );
            $supplierQuery->where('company_code', $user->company_code);
        }

        if ($sectionCode) {
            $paymentsQuery->where(function($q) use ($sectionCode) {
                $q->whereHas('salesTransaction', fn($sq) => $sq->where('section_code', $sectionCode))
                  ->orWhereHas('collectedBy', fn($cq) => $cq->where('section_code', $sectionCode));
            });
            // supplier payments already have section_code column
            $supplierQuery->where('section_code', $sectionCode);
        }

        // get company for header
        $company = null;
        if (auth('company')->check()) {
            $company = auth('company')->user();
        } else {
            $company = $user ? $user->company : null;
        }
        if (!$company) {
            $company = (object) [
                'company_code' => 'C01',
                'name' => 'Company',
            ];
        }

        // if cashier filter is supplied we apply it by joining the sales transaction
        // record where possible – otherwise we can't know which user collected the cash.
        // For service job advance payments, we check the collected_by field.
        if ($cashierId && $cashierId !== 'admin') {
            $paymentsQuery->where('collected_by', $cashierId);
            // restrict supplier payments by creator name
            $selectedUser = \App\Models\User::find($cashierId);
            if ($selectedUser) {
                $supplierQuery->where('created_by_id', $selectedUser->id);
            }
        } elseif ($cashierId === 'admin') {
            // only show entries logged by the currently authenticated admin
            $paymentsQuery->where('collected_by', $user->id);
            $supplierQuery->where('created_by_id', $user->id);
        }

        // order ascending so that we can compute a running balance like a ledger
        $payments = $paymentsQuery->orderBy('date', 'asc')->get();
        $supplierPayments = $supplierQuery->orderBy('payment_date', 'asc')->get();

        // compute opening balance for start date according to role restrictions and optionally cashier/section
        $openingQuery = DayOpeningBalance::query()->where('balance_date', $startDate);
        if ($user->isSuperAdmin()) {
            // Superadmin – filter by selected company if provided
            $superCompanyCode = $request->get('company_code');
            if ($superCompanyCode && $superCompanyCode !== 'all') {
                $openingQuery->where('company_code', $superCompanyCode);
            }
        } else {
            // All other users restricted to their company
            $openingQuery->where('company_code', $user->company_code);
            
            // Section-level users (technicians, etc.) restricted to their section
            if ($user->role && $user->role->level !== 'company_admin' && $user->role->level !== 'super_admin') {
                $openingQuery->where('section_code', $user->section_code);
            }
        }
        if ($sectionCode) {
            $openingQuery->where('section_code', $sectionCode);
        }
        if ($cashierId && $cashierId !== 'admin') {
            // normal user selected, filter by id
            $openingQuery->where('user_id', $cashierId);
        } elseif ($cashierId === 'admin') {
            // show only the logged-in admin's own balance
            $openingQuery->where('user_id', $user->id);
        }

        $openingBalanceTotal = (float) $openingQuery->sum('opening_balance');


        // also gather sales transactions so the UI can show daily sales by cashier
        $salesQuery = \App\Models\SalesTransaction::query()
            ->whereBetween('transaction_date', [$startDate, $endDate])
            ->where('status', 'completed');
        if ($sectionCode) {
            $salesQuery->where('section_code', $sectionCode);
        }
        if ($cashierId && $cashierId !== 'admin') {
            $salesQuery->where('cashier_id', $cashierId);
        } elseif ($cashierId === 'admin') {
            $salesQuery->where('cashier_id', $user->id);
        }
        if ($user->role_id !== 1) {
            $salesQuery->whereHas('cashier', fn($q) => 
                $q->where('company_code', $user->company_code)
            );
        }

        $sales = $salesQuery->orderBy('transaction_date', 'asc')->get();

        // Sum the actual cash portion from each POS sale, deducting any change given
        $totalSalesCash = $sales->sum(function($s) {
            $pd = $s->payment_details;
            $cashTendered = (float) ($pd['cash'] ?? 0);
            if ($cashTendered <= 0) return 0;
            $totalPaid = (float)($pd['cash'] ?? 0) + (float)($pd['card'] ?? 0) + (float)($pd['points'] ?? 0) + (float)($pd['cheque'] ?? 0) + (float)($pd['bank_transfer'] ?? 0);
            $change = max(0, $totalPaid - (float)$s->total_amount);
            return max(0, $cashTendered - $change);
        });

        // Get petty cash outflows for the period
        $expensesQuery = DB::table('petty_cash_transactions')
            ->whereBetween('transaction_date', [$startDate, $endDate]);
        
        if ($sectionCode) {
            $expensesQuery->where('section_code', $sectionCode);
        }
        
        if ($cashierId && $cashierId !== 'admin') {
            $expensesQuery->where('created_by_id', $cashierId);
        } elseif ($cashierId === 'admin') {
            $expensesQuery->where('created_by_id', $user->id);
        }
        if ($user->role_id !== 1) {
            $expensesQuery->where('company_code', $user->company_code);
        }

        $expenses = $expensesQuery->orderBy('transaction_date', 'asc')->get();

        // summary should represent actual cash received (standalone + sales) minus cash paid out (suppliers + expenses)
        // filter payments to only include standalone receipts (not linked to sales) to avoid double counting
        $standalonePaymentsCash = $payments->filter(fn($p) => 
            !str_starts_with($p->notes ?? '', 'Initial') && !str_starts_with($p->notes ?? '', 'Updated')
        )->sum('amount');
        
        $totalReceipts = $standalonePaymentsCash + $totalSalesCash;
        $totalOutflows = $supplierPayments->sum('paid_amount') + $expenses->sum('amount');

        $summary = [
            'total_amount' => $totalReceipts - $totalOutflows,
            'total_payments' => $payments->filter(fn($p) => !str_starts_with($p->notes ?? '', 'Initial') && !str_starts_with($p->notes ?? '', 'Updated'))->count() + $sales->count() + $supplierPayments->count() + $expenses->count(),
            'average_payment' => ($payments->filter(fn($p) => !str_starts_with($p->notes ?? '', 'Initial') && !str_starts_with($p->notes ?? '', 'Updated'))->count() + $sales->count()) ?
                ($totalReceipts / ($payments->filter(fn($p) => !str_starts_with($p->notes ?? '', 'Initial') && !str_starts_with($p->notes ?? '', 'Updated'))->count() + $sales->count())) : 0,
        ];

        // build a simple ledger: start with opening balance and add each payment/sales chronologically
        $runningBalance = $openingBalanceTotal;
        
        // Combine payments and sales transactions for the ledger
        $ledgerItems = collect();
        
        // Add payments to ledger items.  However, if a payment is linked to a
        // sales transaction we already include that sale separately below; in
        // that case showing both entries results in duplicate credits.  Only
        // include standalone payments (e.g. service job advances) here.
        foreach ($payments as $p) {
            if (str_starts_with($p->notes ?? '', 'Initial') || str_starts_with($p->notes ?? '', 'Updated')) {
                continue; // skip sale receipts, covered by sales loop
            }
            
            $invoiceNo = null;
            if ($p->salesTransaction) {
                $invoiceNo = $p->salesTransaction->invoice_no;
            } elseif (!empty($p->invoice_allocations) && is_array($p->invoice_allocations)) {
                $invoiceNo = 'Multiple Invoices';
            } elseif ($p->serviceJob) {
                $invoiceNo = $p->serviceJob->invoice_number ?: 'SJ-'.$p->serviceJob->job_number;
            }

            $ledgerItems->push([
                'type' => 'payment',
                'id' => $p->id,
                'date' => $p->date,
                'customer_code' => $p->customer_code,
                'customer_name' => optional($p->customer)->name ?: ($p->serviceJob ? 'Advance ' . $p->serviceJob->job_number : $p->customer_code),
                'amount' => (float) $p->amount,
                'method' => $p->method,
                'reference' => $p->reference,
                'invoice_no' => $invoiceNo,
                'notes' => $p->notes,
                'is_credit' => true, // payments are credits (cash received)
            ]);
        }
        
        // Add sales transactions to ledger items (only the cash portion)
        foreach ($sales as $s) {
            $pd = $s->payment_details;
            $cashTendered = (float) ($pd['cash'] ?? 0);
            
            $totalPaid = (float)($pd['cash'] ?? 0) + 
                         (float)($pd['card'] ?? 0) + 
                         (float)($pd['points'] ?? 0) + 
                         (float)($pd['cheque'] ?? 0) + 
                         (float)($pd['bank_transfer'] ?? 0);
            
            $change = max(0, $totalPaid - (float)$s->total_amount);
            $cashAmt = max(0, $cashTendered - $change);

            if ($cashAmt > 0) {
                $ledgerItems->push([
                    'type' => 'sale',
                    'id' => $s->id,
                    'date' => $s->transaction_date->format('Y-m-d'),
                    'customer_code' => $s->customer_code,
                    'customer_name' => $s->customer_name ?: $s->customer_code,
                    'amount' => $cashAmt,
                    'method' => 'cash',
                    'reference' => $s->invoice_no,
                    'notes' => 'POS Sale - ' . $s->invoice_no,
                    'is_credit' => true,
                ]);
            }
        }

        // Add petty cash outflows to ledger items (as cash outflows)
        foreach ($expenses as $ex) {
            $ledgerItems->push([
                'type' => 'expense',
                'id' => $ex->id,
                'date' => $ex->transaction_date,
                'customer_code' => 'EXPENSE',
                'customer_name' => 'Expense',
                'amount' => (float) $ex->amount,
                'method' => 'cash',
                'reference' => 'EXP-' . $ex->id,
                'notes' => $ex->notes ?: 'Cash Expense',
                'is_credit' => false,
            ]);
        }
        
        // Add supplier payments to ledger items (as cash outflows)
        foreach ($supplierPayments as $sp) {
            $ledgerItems->push([
                'type' => 'supplier_payment',
                'id' => $sp->id,
                'date' => $sp->payment_date,
                'customer_code' => $sp->supplier_code,
                'customer_name' => $sp->supplier_name,
                'amount' => (float) $sp->paid_amount,
                'method' => $sp->payment_method,
                'reference' => $sp->payment_no,
                'notes' => 'Supplier Payment',
                'is_credit' => false, // supplier payments are debits (cash paid out)
            ]);
        }
        
        // Sort all items by date
        $ledgerItems = $ledgerItems->sortBy('date');
        
        // Build the ledger array
        $ledger = $ledgerItems->map(function ($item) use (&$runningBalance) {
            $amt = $item['amount'];
            if ($item['is_credit']) {
                $runningBalance += $amt;
                $debit = 0;
                $credit = $amt;
            } else {
                $runningBalance -= $amt;
                $debit = $amt;
                $credit = 0;
            }

            return [
                'id' => $item['id'],
                'date' => $item['date'],
                'customer_code' => $item['customer_code'],
                'customer_name' => $item['customer_name'],
                'debit' => $debit,
                'credit' => $credit,
                'method' => $item['method'],
                'reference' => $item['reference'],
                'invoice_no' => $item['invoice_no'] ?? null,
                'notes' => $item['notes'],
                'running_balance' => $runningBalance,
            ];
        })->toArray();

        // force numeric indexes so JSON-serialization produces an array, not an
        // object with string keys – defensive, avoids client 'map is not a
        // function' errors when ledger is unexpectedly empty or
        // non-sequential.
        $ledger = array_values($ledger);

        // build cashier list for filters: all users with cashier role, include a flag if they have an opening balance on start date
        // select all users associated with the company/section to allow any staff member's collections to be viewed.
        $cashierQuery = \App\Models\User::query();

        if ($user->isSuperAdmin()) {
            // Superadmin can filter by company
            if ($request->get('company_code')) {
                $cashierQuery->where('company_code', $request->get('company_code'));
            }
        } else {
            // Everyone else is restricted to their company
            $cashierQuery->where('company_code', $user->company_code);
            
            // Technicians or lower levels restricted to their section
            if ($user->role && $user->role->level !== 'company_admin' && $user->role->level !== 'super_admin') {
                $cashierQuery->where('section_code', $user->section_code);
            }
        }
        if ($sectionCode) {
            $cashierQuery->where('section_code', $sectionCode);
        }
        $allCashiers = $cashierQuery->select('id', 'first_name', 'last_name')->get();

        // fetch opening balances for each cashier on the start date so we can show
        // the amount for the currently‑selected cashier without having to reload the
        // page just for that value.
        // retrieve all columns from the opening balance table so the frontend can
        // display full records (equivalent to SELECT *). We may filter later by
        // cashier but always start with the full set for the date.
        $balances = DayOpeningBalance::where('balance_date', $startDate)
            ->when(!$user->isSuperAdmin(), fn($q) => $q->where('company_code', $user->company_code))
            ->when($user->role && $user->role->level !== 'company_admin' && $user->role->level !== 'super_admin', 
                fn($q) => $q->where('section_code', $user->section_code))
            ->when($sectionCode, fn($q) => $q->where('section_code', $sectionCode))
            ->get();

        // If the selected cashier has no opening balance record for the start date,
        // attempt to find the earliest opening balance within the report range.
        if ($cashierId) {
            $targetUserId = $cashierId === 'admin' ? $user->id : $cashierId;

            if ($balances->where('user_id', $targetUserId)->isEmpty()) {
                $fallback = DayOpeningBalance::query()
                    ->where('user_id', $targetUserId)
                    ->whereBetween('balance_date', [$startDate, $endDate])
                    ->when($sectionCode, fn($q) => $q->where('section_code', $sectionCode))
                    ->orderBy('balance_date', 'asc')
                    ->first();

                if ($fallback) {
                    $openingBalanceTotal = (float) $fallback->opening_balance;
                    $balances->push($fallback);
                }
            }
        }

        // if cashier filter applied, also prepare records for that cashier
        $openingRecords = $balances;
        if ($cashierId && $cashierId !== 'admin') {
            $openingRecords = $balances->filter(fn($b) => $b->user_id == (int)$cashierId);
        } elseif ($cashierId === 'admin') {
            // only show the logged in admin's own opening record
            $openingRecords = $balances->filter(fn($b) => $b->user_id == $user->id);
        }

        $balanceUserIds = $balances->pluck('user_id')->unique()->toArray();

        // build a map so the front‑end can look up an individual cashier's balance
        $balanceMap = $balances->groupBy('user_id')->map(fn($group) =>
            $group->sum('opening_balance')
        )->toArray();

        $cashiers = $allCashiers->map(fn($u) => [
            'id' => $u->id,
            'name' => trim($u->first_name . ' ' . $u->last_name),
            'has_balance' => in_array($u->id, $balanceUserIds),
            'opening_balance' => $balanceMap[$u->id] ?? 0,
        ])->values();

        // prepend an 'Admin' option representing the current admin's balance
        $adminBalance = $balances->where('user_id', $user->id)->sum('opening_balance');
        $cashiers->prepend([
            'id' => 'admin',
            'name' => 'Admin',
            'has_balance' => $adminBalance > 0,
            'opening_balance' => $adminBalance,
        ]);

        // also supply available sections for the dropdown
        $sectionsQuery = \App\Models\Section::query();
        if (!$user->isSuperAdmin()) {
            $sectionsQuery->where('company_code', $user->company_code);
            if ($user->role && $user->role->level !== 'company_admin' && $user->role->level !== 'super_admin') {
                $sectionsQuery->where('section_code', $user->section_code);
            }
        }
        $sections = $sectionsQuery->select('section_code', 'name')->get();

        // Get available companies and sections based on user role
        $companies = collect();
        if ($user->isSuperAdmin()) {
            $companies = \App\Models\Company::select('id', 'name', 'company_code')->get();
        }

        return inertia('Reports/CashCollectionReport', [
            'company' => $company,
            'companies' => $companies,
            'payments' => $payments,
            'sales' => $sales,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'cashier_id' => $cashierId,
                'section_code' => $sectionCode,
                'company_code' => $request->get('company_code'),
            ],
            'summary' => $summary,
            'opening_balance' => $openingBalanceTotal,
            'closing_balance' => $runningBalance,
            'ledger' => $ledger,
            'cashiers' => $cashiers,
            'opening_records' => $openingRecords->values(),
            'sections' => $sections,
        ]);
    }

    public function export(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasPermission('reports.cash_collection')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view cash collection reports.');
        }

        $user = Auth::user();
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth()->format('Y-m-d'));
        $cashierId = $request->get('cashier_id');
        $sectionCode = $request->get('section_code');

        // the export should match the report logic so reuse the same filters and computations

        // cash receipts
        $paymentsQuery = CustomerPayment::with(['customer','serviceJob','salesTransaction'])
            ->whereBetween('date', [$startDate, $endDate])
            ->where('method', 'cash');

        // supplier payments (cash outflows)
        $supplierQuery = \App\Models\SupplierPayment::query()
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->where('payment_method', 'Cash');

        // apply role-based company restriction to all base queries for export
        if (!$user->isSuperAdmin()) {
            $paymentsQuery->whereHas('collectedBy', fn($q) => 
                $q->where('company_code', $user->company_code)
            );
            $supplierQuery->where('company_code', $user->company_code);
        }

        if ($sectionCode) {
            $paymentsQuery->where(function($q) use ($sectionCode) {
                $q->whereHas('salesTransaction', fn($sq) => $sq->where('section_code', $sectionCode))
                  ->orWhereHas('collectedBy', fn($cq) => $cq->where('section_code', $sectionCode));
            });
            $supplierQuery->where('section_code', $sectionCode);
        }

        if ($cashierId && $cashierId !== 'admin') {
            $paymentsQuery->where('collected_by', $cashierId);

            $selectedUser = \App\Models\User::find($cashierId);
            if ($selectedUser) {
                $supplierQuery->where('created_by_id', $selectedUser->id);
            }
        } elseif ($cashierId === 'admin') {
            $paymentsQuery->where('collected_by', $user->id);
            $supplierQuery->where('created_by_id', $user->id);
        }

        $payments = $paymentsQuery->orderBy('date', 'asc')->get();
        $supplierPayments = $supplierQuery->orderBy('payment_date', 'asc')->get();

        $openingQuery = DayOpeningBalance::query()->where('balance_date', $startDate);
        if (!$user->isSuperAdmin()) {
            $openingQuery->where('company_code', $user->company_code);
            if ($user->role && $user->role->level !== 'company_admin' && $user->role->level !== 'super_admin') {
                $openingQuery->where('section_code', $user->section_code);
            }
        }
        if ($sectionCode) {
            $openingQuery->where('section_code', $sectionCode);
        }
        if ($cashierId && $cashierId !== 'admin') {
            $openingQuery->where('user_id', $cashierId);
        } elseif ($cashierId === 'admin') {
            $openingQuery->where('user_id', $user->id);
        }

        $openingBalanceTotal = (float) $openingQuery->sum('opening_balance');

        // fallback to first opening balance within range when start date record is missing
        if ($cashierId) {
            $targetUserId = $cashierId === 'admin' ? $user->id : $cashierId;
            $balanceExists = DayOpeningBalance::where('balance_date', $startDate)
                ->when(!$user->isSuperAdmin(), fn($q) => $q->where('company_code', $user->company_code))
                ->when($user->role && $user->role->level !== 'company_admin' && $user->role->level !== 'super_admin', 
                    fn($q) => $q->where('company_code', $user->company_code)->where('section_code', $user->section_code))
                ->when($sectionCode, fn($q) => $q->where('section_code', $sectionCode))
                ->where('user_id', $targetUserId)
                ->exists();

            if (! $balanceExists) {
                $fallback = DayOpeningBalance::query()
                    ->where('user_id', $targetUserId)
                    ->whereBetween('balance_date', [$startDate, $endDate])
                    ->when($sectionCode, fn($q) => $q->where('section_code', $sectionCode))
                    ->orderBy('balance_date', 'asc')
                    ->first();

                if ($fallback) {
                    $openingBalanceTotal = (float) $fallback->opening_balance;
                }
            }
        }

        // sales transactions for the report ledger
        $salesQuery = \App\Models\SalesTransaction::query()
            ->whereBetween('transaction_date', [$startDate, $endDate])
            ->where('status', 'completed');
        if ($sectionCode) {
            $salesQuery->where('section_code', $sectionCode);
        }
        if ($cashierId && $cashierId !== 'admin') {
            $salesQuery->where('cashier_id', $cashierId);
        } elseif ($cashierId === 'admin') {
            $salesQuery->where('cashier_id', $user->id);
        }

        if ($user->role_id !== 1) {
            $salesQuery->whereHas('cashier', fn($q) => 
                $q->where('company_code', $user->company_code)
            );
        }

        $sales = $salesQuery->orderBy('transaction_date', 'asc')->get();
        
        // Sum the actual cash portion from each POS sale
        // Sum the actual cash portion from each POS sale, deducting any change given
        $totalSalesCash = $sales->sum(function($s) {
            $pd = $s->payment_details;
            $cashTendered = (float) ($pd['cash'] ?? 0);
            if ($cashTendered <= 0) return 0;
            $totalPaid = (float)($pd['cash'] ?? 0) + (float)($pd['card'] ?? 0) + (float)($pd['points'] ?? 0) + (float)($pd['cheque'] ?? 0) + (float)($pd['bank_transfer'] ?? 0);
            $change = max(0, $totalPaid - (float)$s->total_amount);
            return max(0, $cashTendered - $change);
        });

        // Get petty cash outflows for the period
        $expensesQuery = DB::table('petty_cash_transactions')
            ->whereBetween('transaction_date', [$startDate, $endDate]);
        
        if ($sectionCode) {
            $expensesQuery->where('section_code', $sectionCode);
        }
        
        if ($cashierId && $cashierId !== 'admin') {
            $expensesQuery->where('created_by_id', $cashierId);
        } elseif ($cashierId === 'admin') {
            $expensesQuery->where('created_by_id', $user->id);
        }

        if ($user->role_id !== 1) {
            $expensesQuery->where('company_code', $user->company_code);
        }

        $expenses = $expensesQuery->orderBy('transaction_date', 'asc')->get();

        // summary should represent actual cash received (standalone + sales) minus cash paid out (suppliers + expenses)
        // filter payments to only include standalone receipts (not linked to sales) to avoid double counting
        $standalonePaymentsCash = $payments->filter(fn($p) => 
            !str_starts_with($p->notes ?? '', 'Initial') && !str_starts_with($p->notes ?? '', 'Updated')
        )->sum('amount');
        
        $totalReceipts = $standalonePaymentsCash + $totalSalesCash;
        $totalOutflows = $supplierPayments->sum('paid_amount') + $expenses->sum('amount');

        $summary = [
            'total_amount' => $totalReceipts - $totalOutflows,
            'total_payments' => $payments->filter(fn($p) => !str_starts_with($p->notes ?? '', 'Initial') && !str_starts_with($p->notes ?? '', 'Updated'))->count() + $sales->count() + $supplierPayments->count() + $expenses->count(),
            'average_payment' => ($payments->filter(fn($p) => !str_starts_with($p->notes ?? '', 'Initial') && !str_starts_with($p->notes ?? '', 'Updated'))->count() + $sales->count()) ?
                ($totalReceipts / ($payments->filter(fn($p) => !str_starts_with($p->notes ?? '', 'Initial') && !str_starts_with($p->notes ?? '', 'Updated'))->count() + $sales->count())) : 0,
        ];

        $runningBalance = $openingBalanceTotal;
        $ledgerItems = collect();

        foreach ($payments as $p) {
            if (str_starts_with($p->notes ?? '', 'Initial') || str_starts_with($p->notes ?? '', 'Updated')) {
                continue;
            }

            $invoiceNo = null;
            if ($p->salesTransaction) {
                $invoiceNo = $p->salesTransaction->invoice_no;
            } elseif (!empty($p->invoice_allocations) && is_array($p->invoice_allocations)) {
                $invoiceNo = 'Multiple Invoices';
            } elseif ($p->serviceJob) {
                $invoiceNo = $p->serviceJob->invoice_number ?: 'SJ-'.$p->serviceJob->job_number;
            }

            $ledgerItems->push([
                'type' => 'payment',
                'id' => $p->id,
                'date' => $p->date,
                'customer_code' => $p->customer_code,
                'customer_name' => optional($p->customer)->name ?: ($p->serviceJob ? 'Advance ' . $p->serviceJob->job_number : $p->customer_code),
                'amount' => (float) $p->amount,
                'method' => $p->method,
                'reference' => $p->reference,
                'invoice_no' => $invoiceNo,
                'notes' => $p->notes,
                'is_credit' => true,
            ]);
        }

        // Add sales transactions to ledger items (only the cash portion)
        foreach ($sales as $s) {
            $pd = $s->payment_details;
            $cashTendered = (float) ($pd['cash'] ?? 0);
            
            $totalPaid = (float)($pd['cash'] ?? 0) + 
                         (float)($pd['card'] ?? 0) + 
                         (float)($pd['points'] ?? 0) + 
                         (float)($pd['cheque'] ?? 0) + 
                         (float)($pd['bank_transfer'] ?? 0);
            
            $change = max(0, $totalPaid - (float)$s->total_amount);
            $cashAmt = max(0, $cashTendered - $change);

            if ($cashAmt > 0) {
                $ledgerItems->push([
                    'type' => 'sale',
                    'id' => $s->id,
                    'date' => $s->transaction_date->format('Y-m-d'),
                    'customer_code' => $s->customer_code,
                    'customer_name' => $s->customer_name ?: $s->customer_code,
                    'amount' => $cashAmt,
                    'method' => 'cash',
                    'reference' => $s->invoice_no,
                    'notes' => 'POS Sale - ' . $s->invoice_no,
                    'is_credit' => true,
                ]);
            }
        }

        // Add petty cash outflows to ledger items (as cash outflows)
        foreach ($expenses as $ex) {
            $ledgerItems->push([
                'type' => 'expense',
                'id' => $ex->id,
                'date' => $ex->transaction_date,
                'customer_code' => 'EXPENSE',
                'customer_name' => 'Expense',
                'amount' => (float) $ex->amount,
                'method' => 'cash',
                'reference' => 'EXP-' . $ex->id,
                'notes' => $ex->notes ?: 'Cash Expense',
                'is_credit' => false,
            ]);
        }

        foreach ($supplierPayments as $sp) {
            $ledgerItems->push([
                'type' => 'supplier_payment',
                'id' => $sp->id,
                'date' => $sp->payment_date,
                'customer_code' => $sp->supplier_code,
                'customer_name' => $sp->supplier_name,
                'amount' => (float) $sp->paid_amount,
                'method' => $sp->payment_method,
                'reference' => $sp->payment_no,
                'notes' => 'Supplier Payment',
                'is_credit' => false,
            ]);
        }

        $ledgerItems = $ledgerItems->sortBy('date');

        $ledger = $ledgerItems->map(function ($item) use (&$runningBalance) {
            $amt = $item['amount'];
            if ($item['is_credit']) {
                $runningBalance += $amt;
                $debit = 0;
                $credit = $amt;
            } else {
                $runningBalance -= $amt;
                $debit = $amt;
                $credit = 0;
            }

            return [
                'id' => $item['id'],
                'date' => $item['date'],
                'customer_code' => $item['customer_code'],
                'customer_name' => $item['customer_name'],
                'debit' => $debit,
                'credit' => $credit,
                'method' => $item['method'],
                'reference' => $item['reference'],
                'invoice_no' => $item['invoice_no'] ?? null,
                'notes' => $item['notes'],
                'running_balance' => $runningBalance,
            ];
        })->values()->toArray();

        $csvRows = [];
        $csvRows[] = ['Cash Collection Report'];
        $csvRows[] = ['Period', "{$startDate} to {$endDate}"];
        if ($sectionCode) {
            $csvRows[] = ['Section', $sectionCode];
        }
        if ($cashierId) {
            $cashierUser = \App\Models\User::find($cashierId);
            $cashierName = $cashierId === 'admin' ? 'Admin' : ($cashierUser ? trim($cashierUser->first_name . ' ' . $cashierUser->last_name) : $cashierId);
            $csvRows[] = ['Cashier', $cashierName];
        }
        $csvRows[] = ['Opening Balance', $openingBalanceTotal];
        $csvRows[] = ['Total Collected', $summary['total_amount']];
        $csvRows[] = [];
        $csvRows[] = ['Date', 'Customer', 'Debit', 'Credit', 'Running Balance', 'Notes'];

        foreach ($ledger as $row) {
            $csvRows[] = [
                $row['date'],
                $row['customer_name'] ?? $row['customer_code'],
                $row['debit'],
                $row['credit'],
                $row['running_balance'],
                !empty($row['invoice_no']) ? ($row['invoice_no'] . ' - ' . ($row['notes'] ?? '')) : ($row['notes'] ?? ''),
            ];
        }

        $filename = "cash_collection_report_{$startDate}_to_{$endDate}.csv";
        $handle = fopen('php://output', 'w');
        ob_start();
        foreach ($csvRows as $row) {
            fputcsv($handle, $row);
        }
        fclose($handle);
        $csvContent = ob_get_clean();

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
