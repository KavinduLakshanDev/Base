<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\AccTrn;
use App\Models\CustomerPayment;
use App\Models\BankAccount;
use App\Models\Section;
use App\Services\NumberGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ChequeDepositController extends Controller
{
    /**
     * Display the cheque deposit page.
     */
    public function index(): Response|RedirectResponse
    {
        if (!Auth::user()->hasPermission('cheque_deposits.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to access cheque deposits.');
        }

        $user = Auth::user();

        // Load deposit history
        $customerDeposits = CustomerPayment::with(['customer', 'depositBank'])
            ->where('is_deposited', true)
            ->where('method', 'cheque')
            ->whereHas('customer', function($q) use ($user) {
                $q->where('company_code', $user->company_code);
            })
            ->orderByDesc('deposited_at')
            ->take(50)
            ->get();

        $deliveryDeposits = \App\Models\DeliveryPayment::with(['delivery.shop', 'depositBank'])
            ->where('is_deposited', true)
            ->where('method', 'cheque')
            ->where('company_code', $user->company_code)
            ->orderByDesc('deposited_at')
            ->take(50)
            ->get();

        $depositHistory = collect()
            ->concat($customerDeposits->map(fn($row) => [
                'id'             => $row->id,
                'type'           => 'customer',
                'cheque_no'      => $row->cheque_no,
                'bank_name'      => $row->bank_name,
                'branch'         => $row->branch,
                'amount'         => (float) $row->amount,
                'cheque_date'    => $row->cheque_date,
                'deposited_at'   => $row->deposited_at,
                'deposit_bank'   => $row->depositBank ? $row->depositBank->bank_name . ' (' . $row->depositBank->account_name . ')' : 'N/A',
                'customer_name'  => $row->customer ? ($row->customer->FstNm . ' ' . $row->customer->LstNm) : $row->customer_code,
            ]))
            ->concat($deliveryDeposits->map(fn($row) => [
                'id'             => $row->id,
                'type'           => 'delivery',
                'cheque_no'      => $row->cheque_no,
                'bank_name'      => $row->bank_name,
                'branch'         => $row->branch,
                'amount'         => (float) $row->amount,
                'cheque_date'    => $row->payment_date,
                'deposited_at'   => $row->deposited_at,
                'deposit_bank'   => $row->depositBank ? $row->depositBank->bank_name . ' (' . $row->depositBank->account_name . ')' : 'N/A',
                'customer_name'  => $row->delivery?->shop?->name ?? 'Unknown Shop',
            ]))
            ->sortByDesc('deposited_at')
            ->values();

        return Inertia::render('pos/cheque-deposit/index', [
            'depositHistory' => $depositHistory,
        ]);
    }

    /**
     * Show the form for processing a new deposit.
     */
    public function create()
    {
        $user = Auth::user();
        if (!$user->hasPermission('cheque_deposits.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        // Fetch bank accounts (for the dropdown)
        $bankAccounts = BankAccount::where('company_code', $user->company_code)
            ->where('status', 'active')
            ->orderBy('bank_name')
            ->get(['id', 'account_name', 'bank_name', 'branch_name']);

        return Inertia::render('pos/cheque-deposit/create', [
            'bankAccounts' => $bankAccounts,
        ]);
    }

    /**
     * Get pending cheques for deposit.
     */
    public function getPendingCheques(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user->hasPermission('cheque_deposits.view')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $cheques = CustomerPayment::with(['customer'])
            ->where('method', 'cheque')
            ->where('is_deposited', false)
            ->where('status', '!=', 'returned')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('acc_trn')
                    ->whereColumn('acc_trn.ChqueNo', 'customer_payments.cheque_no')
                    ->whereColumn('acc_trn.BankNm', 'customer_payments.bank_name')
                    ->where('acc_trn.Amt', '>', 0)
                    ->where('acc_trn.Reason', 'like', 'Cheque Return%')
                    ->where('acc_trn.Status', 'A')
                    ->where('acc_trn.company_code', Auth::user()->company_code);
            })
            ->whereHas('customer', function($q) use ($user) {
                $q->where('company_code', $user->company_code);
            })
            ->orderBy('cheque_date', 'asc')
            ->get()
            ->map(function ($row) {
                return [
                    'id'            => $row->id,
                    'type'          => 'customer',
                    'cheque_no'     => $row->cheque_no,
                    'bank_name'     => $row->bank_name,
                    'branch'        => $row->branch,
                    'amount'        => (float) $row->amount,
                    'cheque_date'   => $row->cheque_date,
                    'customer_name' => $row->customer ? ($row->customer->FstNm . ' ' . $row->customer->LstNm) : $row->customer_code,
                ];
            });

        $deliveryCheques = \App\Models\DeliveryPayment::with(['delivery.shop'])
            ->where('method', 'cheque')
            ->whereIn('status', ['pending', 'cleared'])
            ->where('is_deposited', false)
            ->where('company_code', $user->company_code)
            ->orderBy('payment_date', 'asc')
            ->get()
            ->map(function ($row) {
                return [
                    'id'            => $row->id,
                    'type'          => 'delivery',
                    'cheque_no'     => $row->cheque_no,
                    'bank_name'     => $row->bank_name,
                    'branch'        => $row->branch,
                    'amount'        => (float) $row->amount,
                    'cheque_date'   => $row->payment_date,
                    'customer_name' => $row->delivery?->shop?->name ?? 'Unknown Shop',
                ];
            });

        $cheques = collect($cheques)->concat($deliveryCheques)->sortBy('cheque_date')->values();

        return response()->json([
            'success' => true,
            'cheques' => $cheques
        ]);
    }

    /**
     * Process cheque deposit.
     */
    public function deposit(Request $request): JsonResponse
    {
        Log::info('Cheque deposit: request received', [
            'method' => $request->method(),
            'url' => $request->url(),
            'content_type' => $request->header('Content-Type'),
            'wants_json' => $request->expectsJson(),
            'has_x_inertia' => $request->header('X-Inertia'),
            'cheque_items_raw' => $request->input('cheque_items'),
            'bank_account_id_raw' => $request->input('bank_account_id'),
            'deposit_date_raw' => $request->input('deposit_date'),
            'all_input_keys' => array_keys($request->all()),
        ]);

        $request->validate([
            'cheque_items'    => ['required', 'array'],
            'cheque_items.*.id'   => ['required', 'integer'],
            'cheque_items.*.type' => ['required', 'in:customer,delivery'],
            'bank_account_id' => ['required', 'integer', 'exists:bank_accounts,id'],
            'deposit_date'    => ['required', 'date'],
        ]);

        if (!Auth::user()->hasPermission('cheque_deposits.create')) {
            Log::warning('Cheque deposit: unauthorized user', ['user_id' => Auth::id()]);
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        Log::info('Cheque deposit: validated, starting transaction', [
            'user_id' => Auth::id(),
            'cheque_items_count' => count($request->cheque_items),
            'bank_account_id' => $request->bank_account_id,
            'deposit_date' => $request->deposit_date,
        ]);

        try {
            DB::beginTransaction();

            $bankAccount = BankAccount::lockForUpdate()->find($request->bank_account_id);
            if (!$bankAccount) {
                DB::rollBack();
                Log::warning('Cheque deposit: bank account not found', ['bank_account_id' => $request->bank_account_id]);
                return response()->json(['success' => false, 'message' => 'Bank account not found.'], 422);
            }

            // Generate one deposit reference number for the entire batch
            $depositRef = NumberGeneratorService::generate(
                'cheque_deposit',
                Auth::user()->company_code,
                Auth::user()->section_code ?? 'MAIN'
            );

            $totalDeposited = 0;
            $depositedCount = 0;

            foreach ($request->cheque_items as $index => $item) {
                $id   = $item['id'];
                $type = $item['type'];

                Log::info("Cheque deposit: processing item #{$index}", [
                    'id'   => $id,
                    'type' => $type,
                ]);

                if ($type === 'delivery') {
                    $payment = \App\Models\DeliveryPayment::lockForUpdate()->find($id);
                    if (!$payment) {
                        Log::warning("Cheque deposit: delivery payment #{$id} not found in DB");
                        continue;
                    }
                    if ($payment->is_deposited) {
                        Log::warning("Cheque deposit: delivery payment #{$id} already deposited");
                        continue;
                    }
                    if (!in_array($payment->status, ['pending', 'cleared'])) {
                        Log::warning("Cheque deposit: delivery payment #{$id} status is '{$payment->status}', expected 'pending' or 'cleared'");
                        continue;
                    }

                    $payment->update([
                        'is_deposited'    => true,
                        'deposited_at'    => $request->deposit_date,
                        'deposit_bank_id' => $request->bank_account_id,
                        'status'          => 'cleared',
                    ]);
                    $depositedCount++;
                    Log::info("Cheque deposit: delivery payment #{$id} updated successfully");

                    // --- Journal entry: bank receives delivery cheque ---
                    AccTrn::create([
                        'FInAct'      => true,
                        'Status'      => 'A',
                        'AccKy'       => null,
                        'TrnDt'       => $request->deposit_date,
                        'TrnNo'       => $depositRef,
                        'VaucherNo'   => $depositRef,
                        'Amt'         => (float) $payment->amount,          // positive = money in bank
                        'ChqueNo'     => $payment->cheque_no,
                        'BankNm'      => $payment->bank_name,
                        'BranchNm'    => $payment->branch,
                        'FChqDet'     => true,
                        'Reason'      => 'Cheque Deposit (Delivery)',
                        'Dec'         => 'Deposited to ' . $bankAccount->bank_name . ' - ' . $bankAccount->account_name
                                        . ' | Cheque: ' . $payment->cheque_no
                                        . ' | Delivery Payment ID: ' . $payment->id,
                        'company_code' => Auth::user()->company_code,
                        'section_code' => Auth::user()->section_code,
                        'customer_name' => null,
                    ]);

                } else {
                    $payment = CustomerPayment::with('accTrn')->lockForUpdate()->find($id);
                    if (!$payment) {
                        Log::warning("Cheque deposit: customer payment #{$id} not found in DB");
                        continue;
                    }
                    if ($payment->is_deposited) {
                        Log::warning("Cheque deposit: customer payment #{$id} (cheque: {$payment->cheque_no}) already deposited");
                        continue;
                    }
                    if ($payment->status === 'returned' || ($payment->accTrn && $payment->accTrn->FReturn)) {
                        throw new \Exception("Cheque No {$payment->cheque_no} has been returned and cannot be deposited.");
                    }

                    $payment->update([
                        'is_deposited'    => true,
                        'deposited_at'    => $request->deposit_date,
                        'deposit_bank_id' => $request->bank_account_id,
                    ]);
                    $depositedCount++;
                    Log::info("Cheque deposit: customer payment #{$id} updated successfully");

                    // --- Journal entry: bank receives customer cheque ---
                    AccTrn::create([
                        'FInAct'      => true,
                        'Status'      => 'A',
                        'AccKy'       => $payment->accTrn?->AccKy ?? null,
                        'TrnDt'       => $request->deposit_date,
                        'TrnNo'       => $depositRef,
                        'VaucherNo'   => $depositRef,
                        'Amt'         => (float) $payment->amount,          // positive = money in bank
                        'ChqueNo'     => $payment->cheque_no,
                        'BankNm'      => $payment->bank_name,
                        'BranchNm'    => $payment->branch,
                        'RBDT'        => $payment->cheque_date,
                        'FChqDet'     => true,
                        'Reason'      => 'Cheque Deposit',
                        'Dec'         => 'Deposited to ' . $bankAccount->bank_name . ' - ' . $bankAccount->account_name
                                        . ' | Cheque: ' . $payment->cheque_no
                                        . ' | Customer Payment ID: ' . $payment->id,
                        'company_code'        => Auth::user()->company_code,
                        'section_code'        => Auth::user()->section_code,
                        'customer_code'       => $payment->customer_code ?? null,
                        'customer_name'       => $payment->accTrn?->customer_name ?? null,
                        'original_payment_id' => $payment->accTrn?->AccTrnKy ?? null,
                    ]);
                }

                $totalDeposited += (float) $payment->amount;
            }

            if ($depositedCount === 0) {
                DB::rollBack();
                Log::warning('Cheque deposit: no cheques were deposited', [
                    'total_items' => count($request->cheque_items),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'No cheques were deposited. They may have already been deposited or are in an invalid state.'
                ], 422);
            }

            $bankAccount->current_balance += $totalDeposited;
            $bankAccount->save();

            DB::commit();

            Log::info('Cheque deposit: completed successfully', [
                'user_id' => Auth::id(),
                'bank_account_id' => $request->bank_account_id,
                'deposited_count' => $depositedCount,
                'total_deposited' => $totalDeposited,
            ]);

            return response()->json([
                'success' => true,
                'message' => "{$depositedCount} cheque(s) deposited successfully",
                'total_deposited' => $totalDeposited
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Cheque deposit failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to deposit cheques: ' . $e->getMessage()
            ], 500);
        }
    }
}
