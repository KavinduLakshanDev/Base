<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\TrnMas;
use App\Models\AccTrn;
use App\Models\AccMas;
use App\Models\Address;
use App\Models\BankAccount;
use App\Models\Section;
use App\Models\ServiceJob;
use App\Models\SalesTransaction;
use App\Models\CustomerPayment;
use App\Services\NumberGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ChequeReturnController extends Controller
{
    /**
     * Display the cheque return page.
     */
    public function index(): Response|RedirectResponse
    {
        if (!Auth::user()->hasPermission('cheque_returns.view') && !Auth::user()->hasPermission('cheque_returns.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to access cheque returns.');
        }

        $user = Auth::user();

        // Load cheque return history.
        // 1. Load from standard ledger (AccTrn)
        $accTrnHistory = AccTrn::with(['accMas'])
            ->where('Amt', '>', 0)
            ->where('FInAct', true)
            ->where('Status', 'A')
            ->where('company_code', $user->company_code)
            ->where(function ($q) {
                $q->where('Reason', 'like', 'Cheque Return%')
                  ->orWhereNotNull('original_payment_id');
            })
            ->orderByDesc('created_at')
            ->take(200)
            ->get();

        // 2. Load from Delivery Payments (for shops without ledger accounts)
        $deliveryBounced = \App\Models\DeliveryPayment::where('company_code', $user->company_code)
            ->where('status', 'bounced')
            ->with(['delivery.shop'])
            ->orderByDesc('updated_at')
            ->take(100)
            ->get();
            
        $deliveryServiceCharges = \App\Models\DeliveryPayment::where('company_code', $user->company_code)
            ->where('method', 'service_charge')
            ->whereNotNull('related_payment_id')
            ->with(['delivery.shop'])
            ->orderByDesc('created_at')
            ->take(100)
            ->get();

        // 3. Process AccTrn into unified format
        $unifiedHistory = $accTrnHistory->map(function ($row) {
            $customer = $row->accMas;
            $isServiceCharge = $row->Reason === 'Cheque Return Service Charge';
            $baseReturnNumber = $isServiceCharge
                ? preg_replace('/-SC$/', '', (string) $row->TrnNo)
                : (string) $row->TrnNo;
            return [
                'id'                  => 'acc_' . $row->AccTrnKy,
                'return_number'       => $row->TrnNo,
                'base_return_number'  => $baseReturnNumber,
                'cheque_no'           => $row->ChqueNo,
                'bank_name'           => $row->BankNm,
                'branch_name'         => $row->BranchNm,
                'amount'              => (float) $row->Amt,
                'return_date'         => $row->TrnDt,
                'reason'              => $isServiceCharge ? null : str_replace(['Cheque Return: ', 'Cheque Return (Delivery): '], '', (string) ($row->Reason ?? '')),
                'is_delivery'         => str_contains((string)$row->Reason, '(Delivery)'),
                'customer_name'       => $customer?->AccNm ?? $row->customer_name,
                'customer_code'       => $customer?->AccCd ?? $row->customer_code,
                'is_service_charge'   => $isServiceCharge,
                'original_payment_id' => $row->original_payment_id,
                'created_at'          => $row->created_at,
            ];
        });

        // 4. Process Delivery Bounced into unified format (if not already in AccTrn)
        // We filter out ones that likely have an AccTrn counterpart to avoid duplicates
        $accTrnChequeNos = $unifiedHistory->pluck('cheque_no')->filter()->all();
        
        foreach ($deliveryBounced as $dRow) {
            if (in_array($dRow->cheque_no, $accTrnChequeNos)) continue;
            
            $unifiedHistory->push([
                'id'                  => 'del_b_' . $dRow->id,
                'return_number'       => 'DEL-' . $dRow->id,
                'base_return_number'  => 'DEL-' . $dRow->id,
                'cheque_no'           => $dRow->cheque_no,
                'bank_name'           => $dRow->bank_name,
                'branch_name'         => $dRow->branch,
                'amount'              => (float) $dRow->amount,
                'return_date'         => $dRow->bounced_at?->toDateString() ?? $dRow->updated_at->toDateString(),
                'reason'              => 'Bounced',
                'is_delivery'         => true,
                'customer_name'       => $dRow->delivery->shop->name ?? 'Unknown Shop',
                'customer_code'       => (string) ($dRow->delivery->shop->id ?? ''),
                'is_service_charge'   => false,
                'original_payment_id' => null,
                'created_at'          => $dRow->updated_at,
            ]);
        }

        // 5. Process Delivery Service Charges
        foreach ($deliveryServiceCharges as $scRow) {
            // SC rows in delivery are negative amount, but history expects positive for "Return Amount"
            $unifiedHistory->push([
                'id'                  => 'del_sc_' . $scRow->id,
                'return_number'       => 'DEL-' . $scRow->related_payment_id . '-SC',
                'base_return_number'  => 'DEL-' . $scRow->related_payment_id,
                'cheque_no'           => null,
                'bank_name'           => null,
                'branch_name'         => null,
                'amount'              => abs((float) $scRow->amount),
                'return_date'         => $scRow->payment_date->toDateString(),
                'reason'              => null,
                'is_delivery'         => true,
                'customer_name'       => $scRow->delivery->shop->name ?? 'Unknown Shop',
                'customer_code'       => (string) ($scRow->delivery->shop->id ?? ''),
                'is_service_charge'   => true,
                'original_payment_id' => null,
                'created_at'          => $scRow->created_at,
            ]);
        }

        $returnHistory = $unifiedHistory->sortByDesc('created_at')->values();

        return Inertia::render('pos/cheque-return/index', [
            'returnHistory' => $returnHistory,
        ]);
    }

    /**
     * Show the form for processing a new cheque return.
     */
    public function create(): Response|RedirectResponse
    {
        if (!Auth::user()->hasPermission('cheque_returns.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();
        $bankAccounts = BankAccount::where('company_code', $user->company_code)
            ->where('status', 'active')
            ->orderBy('bank_name')
            ->get(['id', 'account_name', 'bank_name', 'branch_name']);

        return Inertia::render('pos/cheque-return/create', [
            'bankAccounts'  => $bankAccounts,
        ]);
    }

    /**
     * Search for valid cheques by cheque number, bank, and branch.
     */
    public function searchCheque(Request $request): JsonResponse
    {
        $request->validate([
            'cheque_no'        => ['required', 'string'],
            'selected_bank_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'bank_name'        => ['nullable', 'string'],
            'branch_name'      => ['nullable', 'string'],
        ]);

        // If a bank account was selected from dropdown, resolve names from it
        if (!empty($request->selected_bank_id)) {
            $bankAccount = BankAccount::find($request->selected_bank_id);
            if ($bankAccount) {
                $request->merge([
                    'bank_name'   => $bankAccount->bank_name,
                    'branch_name' => $bankAccount->branch_name,
                ]);
            }
        }

        if (empty($request->bank_name)) {
            return response()->json(['success' => false, 'message' => 'Please select a bank.'], 422);
        }

        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        if (!$user->hasPermission('cheque_returns.create')) {
            return response()->json(['error' => 'Unauthorized. Permission required.'], 403);
        }

        try {
            $chequeNo = trim((string) $request->cheque_no);
            $bankName = trim((string) $request->bank_name);
            $branchName = trim((string) ($request->branch_name ?? ''));

            // Log search parameters for debugging
            Log::info('Cheque search initiated', [
                'cheque_no' => $chequeNo,
                'bank_name' => $bankName,
                'branch_name' => $branchName,
                'user_id' => $user->id,
                'user_section' => $user->section_code,
                'user_company' => $user->company_code,
            ]);

            // Search for valid cheques in AccTrn table with flexible matching
            $chequeQuery = AccTrn::with(['accMas'])
                ->whereRaw('LOWER(TRIM(ChqueNo)) = ?', [strtolower($chequeNo)])
                ->whereRaw('LOWER(TRIM(BankNm)) = ?', [strtolower($bankName)])
                ->where('FInAct', true)
                ->where('Status', 'A')
                ->where(function ($q) { $q->whereNull('FReturn')->orWhere('FReturn', false); })
                ->where('Amt', '<', 0) // Only payment records (negative amounts)
                ->where('company_code', $user->company_code);
            
            // Only filter by branch if provided
            if ($branchName !== '') {
                $chequeQuery->whereRaw('LOWER(TRIM(BranchNm)) = ?', [strtolower($branchName)]);
            }

            // Note: Removed strict section filtering for cheque returns
            // Bounced cheques may need to be processed by any branch/section
            // Only company-level filtering is applied

            $cheques = $chequeQuery->get();
            
            Log::info('Cheque search results', [
                'count' => $cheques->count(),
            ]);

            // Check if any of these cheques have already been returned
            // Primary check uses FReturn flag set atomically during the return transaction.
            // The AccTrn sub-query is kept as a fallback for legacy records that predate the flag.
            $validCheques = [];
            foreach ($cheques as $cheque) {
                // Skip if already marked returned
                if ($cheque->FReturn) {
                    continue;
                }

                // Fallback: check for a return AccTrn entry (legacy / migration safety)
                $returnExists = AccTrn::where('original_payment_id', $cheque->AccTrnKy)
                    ->where('FInAct', true)
                    ->where('Status', 'A')
                    ->where('Amt', '>', 0)
                    ->exists();

                if (!$returnExists) {
                    // Get customer details
                    $customer = AccMas::find($cheque->AccKy);
                    $cheque->customer = $customer;

                    // Get customer address for additional details
                    if ($customer) {
                        $address = Address::where('AccKy', $customer->AccKy)->first();
                        if ($address) {
                            $cheque->customer->address_details = [
                                'address' => $address->Address,
                                'city' => $address->City,
                                'phone' => $address->TP1,
                            ];
                        }
                    }

                    $cheque->source_type = 'acc_trn';
                    $cheque->source_sale_id = null;
                    $validCheques[] = $cheque;
                }
            }

            // Fallback source: sales_transactions.payment_details for cheque entries that
            // do not have an acc_trn cheque payment row.
            $existingKeys = collect($validCheques)->map(function ($c) {
                return strtolower(trim((string) $c->ChqueNo)) . '|' .
                    strtolower(trim((string) $c->BankNm)) . '|' .
                    strtolower(trim((string) ($c->BranchNm ?? '')));
            })->all();

            $companySectionCodes = Section::where('company_code', $user->company_code)
                ->pluck('section_code')
                ->filter()
                ->values()
                ->all();
            if (empty($companySectionCodes) && !empty($user->section_code)) {
                $companySectionCodes = [$user->section_code];
            }

            $salesCheques = SalesTransaction::query()
                ->whereIn('section_code', $companySectionCodes)
                ->whereNotNull('payment_details')
                ->whereRaw('LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(payment_details, "$.cheque_no")))) = ?', [strtolower($chequeNo)])
                ->whereRaw('LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(payment_details, "$.cheque_bank")))) = ?', [strtolower($bankName)])
                ->when($branchName !== '', function ($q) use ($branchName) {
                    $q->whereRaw('LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(payment_details, "$.cheque_branch")))) = ?', [strtolower($branchName)]);
                })
                ->whereRaw('COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(payment_details, "$.cheque")) AS DECIMAL(15,2)), 0) > 0')
                ->orderByDesc('transaction_date')
                ->get();

            foreach ($salesCheques as $saleCheque) {
                $payment = (array) ($saleCheque->payment_details ?? []);
                $signature = strtolower(trim((string) ($payment['cheque_no'] ?? ''))) . '|' .
                    strtolower(trim((string) ($payment['cheque_bank'] ?? ''))) . '|' .
                    strtolower(trim((string) ($payment['cheque_branch'] ?? '')));
                if (in_array($signature, $existingKeys, true)) {
                    continue;
                }

                $alreadyReturnedFromSale = AccTrn::where('company_code', $user->company_code)
                    ->where('Reason', 'like', 'Cheque Return:%')
                    ->where('Dec', 'like', '%Original Sale Invoice: ' . $saleCheque->invoice_no . '%')
                    ->where('FInAct', true)
                    ->where('Status', 'A')
                    ->exists();
                if ($alreadyReturnedFromSale) {
                    continue;
                }

                $customer = null;
                if (!empty($saleCheque->customer_code)) {
                    $customer = AccMas::where('AccCd', $saleCheque->customer_code)
                        ->where('company_code', $user->company_code)
                        ->first();
                }
                if (!$customer && !empty($saleCheque->customer_id)) {
                    $adr = Address::find($saleCheque->customer_id);
                    if ($adr) {
                        $customer = AccMas::find($adr->AccKy);
                    }
                }
                if (!$customer) {
                    continue;
                }

                $virtual = (object) [
                    'AccTrnKy' => -1 * (int) $saleCheque->id,
                    'ChqueNo' => (string) ($payment['cheque_no'] ?? ''),
                    'BankNm' => (string) ($payment['cheque_bank'] ?? ''),
                    'BranchNm' => (string) ($payment['cheque_branch'] ?? ''),
                    'Amt' => -1 * abs((float) ($payment['cheque'] ?? 0)),
                    'RBDT' => $saleCheque->transaction_date,
                    'customer' => $customer,
                    'source_type' => 'sales',
                    'source_sale_id' => (int) $saleCheque->id,
                ];
                $validCheques[] = $virtual;
            }
            
            // 3. Search in Delivery Payments
            $deliveryCheques = \App\Models\DeliveryPayment::where('company_code', $user->company_code)
                ->where('method', 'cheque')
                ->whereIn('status', ['pending', 'cleared'])
                ->whereRaw('LOWER(TRIM(cheque_no)) = ?', [strtolower($chequeNo)])
                ->whereRaw('LOWER(TRIM(bank_name)) = ?', [strtolower($bankName)])
                ->when($branchName !== '', function ($q) use ($branchName) {
                    $q->whereRaw('LOWER(TRIM(branch)) = ?', [strtolower($branchName)]);
                })
                ->with(['delivery.shop.externalCustomer'])
                ->get();

            foreach ($deliveryCheques as $dCheque) {
                $shop = $dCheque->delivery->shop ?? null;
                $customer = $shop && $shop->externalCustomer ? \App\Models\AccMas::find($shop->externalCustomer->AccKy) : null;
                
                $virtual = [
                    'AccTrnKy' => -2 * (int) $dCheque->id, // Virtual ID
                    'ChqueNo' => (string) $dCheque->cheque_no,
                    'BankNm' => (string) $dCheque->bank_name,
                    'BranchNm' => (string) $dCheque->branch,
                    'Amt' => -1 * abs((float) $dCheque->amount),
                    'RBDT' => $dCheque->payment_date,
                    'customer' => $customer ? [
                        'AccKy' => $customer->AccKy,
                        'AccCd' => $customer->AccCd,
                        'AccNm' => $customer->AccNm,
                    ] : [
                        'AccKy' => null,
                        'AccCd' => $shop?->id ?? 'DELIVER',
                        'AccNm' => $shop?->name ?? 'Unknown Shop',
                    ],
                    'customer_name' => $customer?->AccNm ?? ($shop?->name ?? 'Unknown Shop'),
                    'customer_code' => $customer?->AccCd ?? ($shop?->id ?? ''),
                    'source_type' => 'delivery',
                    'source_delivery_id' => $dCheque->delivery_id,
                    'delivery_payment_id' => $dCheque->id,
                ];
                
                $validCheques[] = $virtual;
            }

            return response()->json([
                'success' => true,
                'cheques' => $validCheques,
                'message' => count($validCheques) > 0 ? 'Cheques found' : 'No valid cheques found'
            ]);

        } catch (\Exception $e) {
            Log::error('Cheque search failed', [
                'error' => $e->getMessage(),
                'cheque_no' => $request->cheque_no,
                // 'bank_name' => $request->bank_name,
                // 'branch_name' => $request->branch_name,
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to search cheques: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process cheque return.
     */
    public function returnCheque(Request $request): JsonResponse
    {
        $request->validate([
            'cheque_id'      => ['required', 'integer'],
            'source_type'    => ['nullable', 'in:acc_trn,sales,delivery'],
            'source_sale_id' => ['nullable', 'integer', 'exists:sales_transactions,id'],
            'delivery_payment_id' => ['required_if:source_type,delivery', 'nullable', 'integer', 'exists:delivery_payments,id'],
            'return_reason'  => ['required', 'string', 'max:255'],
            'return_date'    => ['required', 'date'],
            'service_charge' => ['nullable', 'numeric', 'min:0'],
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        if (!$user->hasPermission('cheque_returns.create')) {
             return response()->json(['error' => 'Unauthorized. Permission required.'], 403);
        }

        try {
            DB::beginTransaction();
            $sourceType = (string) ($request->input('source_type') ?: 'acc_trn');
            $sourceSaleId = $request->input('source_sale_id');

            $userSection = Section::where('section_code', $user->section_code)->first();
            // Fallback for company admin (no section) -> use default section or allow passing
            if (!$userSection && $user->section_code) {
                 // Log warning but proceed if user has code but section record missing (should not happen)
                 // Or create dummy section object if needed
            }

            $originalCheque = null;
            $originalSale = null;
            $originalAllocations = null; // Track multiple allocations if present
            $customerAccount = null;

            if ($sourceType === 'sales') {
                $saleId = !empty($sourceSaleId) ? (int) $sourceSaleId : abs((int) $request->cheque_id);
                if ($saleId <= 0) {
                    throw new \Exception('Invalid sale reference for cheque return');
                }

                $companySectionCodes = Section::where('company_code', $user->company_code)
                    ->pluck('section_code')
                    ->filter()
                    ->values()
                    ->all();
                if (empty($companySectionCodes) && !empty($user->section_code)) {
                    $companySectionCodes = [$user->section_code];
                }

                $originalSale = SalesTransaction::where('id', $saleId)
                    ->whereIn('section_code', $companySectionCodes)
                    ->lockForUpdate()
                    ->first();
                if (!$originalSale) {
                    throw new \Exception('Cheque sale record not found');
                }

                $payment = (array) ($originalSale->payment_details ?? []);
                $chequeAmount = abs((float) ($payment['cheque'] ?? 0));
                if ($chequeAmount <= 0 || empty($payment['cheque_no'])) {
                    throw new \Exception('No valid cheque details found in sales payment details');
                }

                $alreadyReturnedFromSale = AccTrn::where('company_code', $user->company_code)
                    ->where('Reason', 'like', 'Cheque Return:%')
                    ->where('Dec', 'like', '%Original Sale Invoice: ' . $originalSale->invoice_no . '%')
                    ->where('FInAct', true)
                    ->where('Status', 'A')
                    ->lockForUpdate()
                    ->exists();
                if ($alreadyReturnedFromSale) {
                    throw new \Exception('This cheque has already been returned by another user');
                }

                if (!empty($originalSale->customer_code)) {
                    $customerAccount = AccMas::where('AccCd', $originalSale->customer_code)
                        ->where('company_code', $user->company_code)
                        ->first();
                }
                if (!$customerAccount && !empty($originalSale->customer_id)) {
                    $saleAddress = Address::find($originalSale->customer_id);
                    if ($saleAddress) {
                        $customerAccount = AccMas::find($saleAddress->AccKy);
                    }
                }
                if (!$customerAccount) {
                    throw new \Exception('Customer account not found for this sale');
                }

                $originalCheque = (object) [
                    'AccTrnKy' => null,
                    'AccKy' => $customerAccount->AccKy,
                    'Amt' => -1 * $chequeAmount,
                    'ChqueNo' => (string) ($payment['cheque_no'] ?? ''),
                    'BankNm' => (string) ($payment['cheque_bank'] ?? ''),
                    'BranchNm' => (string) ($payment['cheque_branch'] ?? ''),
                    'customer_code' => $originalSale->customer_code,
                    'customer_name' => $originalSale->customer_name,
                    'FReturn' => false,
                    'original_payment_id' => null,
                ];
            } elseif ($sourceType === 'delivery') {
                $dPaymentId = $request->input('delivery_payment_id');
                $deliveryPayment = \App\Models\DeliveryPayment::with(['delivery.shop.externalCustomer'])
                    ->lockForUpdate()
                    ->findOrFail($dPaymentId);

                if (!in_array($deliveryPayment->status, ['pending', 'cleared'])) {
                    throw new \Exception('This delivery cheque has already been bounced or is in an invalid status');
                }

                $shop = $deliveryPayment->delivery->shop;
                if (!$shop || !$shop->externalCustomer) {
                    // We might need to allow returns even without AccKy, but ledger will be missing.
                    // For now, try to find the AccKy
                    $customerAccount = null;
                } else {
                    $customerAccount = \App\Models\AccMas::find($shop->externalCustomer->AccKy);
                }

                $originalCheque = (object) [
                    'AccTrnKy' => null,
                    'AccKy' => $customerAccount?->AccKy,
                    'Amt' => -1 * abs((float) $deliveryPayment->amount),
                    'ChqueNo' => $deliveryPayment->cheque_no,
                    'BankNm' => $deliveryPayment->bank_name,
                    'BranchNm' => $deliveryPayment->branch,
                    'customer_code' => $shop?->id,
                    'customer_name' => $shop?->name,
                    'FReturn' => false,
                    'delivery_payment' => $deliveryPayment,
                    'original_payment_id' => null,
                ];
            } else {
                // Get the original cheque payment record with SELECT FOR UPDATE lock
                $originalCheque = AccTrn::with(['accMas'])
                    ->where('AccTrnKy', $request->cheque_id)
                    ->where('FInAct', true)
                    ->where('Status', 'A')
                    ->where('company_code', $user->company_code)
                    ->lockForUpdate() // Prevents concurrent modifications
                    ->first();

                if (!$originalCheque) {
                    throw new \Exception('Cheque payment record not found');
                }

                // Fast check: if FReturn is already set, another transaction already processed this
                if ($originalCheque->FReturn) {
                    throw new \Exception('This cheque has already been returned');
                }

                // Secondary check: look for an existing return AccTrn entry (belt-and-suspenders)
                $returnExists = AccTrn::where('original_payment_id', $originalCheque->AccTrnKy)
                    ->where('FInAct', true)
                    ->where('Status', 'A')
                    ->lockForUpdate()
                    ->exists();

                if ($returnExists) {
                    throw new \Exception('This cheque has already been returned by another user');
                }

                // Get customer account
                $customerAccount = AccMas::find($originalCheque->AccKy);
                if (!$customerAccount) {
                    throw new \Exception('Customer account not found');
                }

                // Try to find the original sale if this AccTrn is linked to a payment
                if ($originalCheque->original_payment_id) {
                    $payment = CustomerPayment::find($originalCheque->original_payment_id);
                    if ($payment) {
                        // Case A: Payment was for a single specific invoice
                        if ($payment->sales_transaction_id) {
                            $originalSale = SalesTransaction::lockForUpdate()->find($payment->sales_transaction_id);
                        }
                        
                        // Case B: Payment was split across multiple invoices (invoice_allocations)
                        // We will store these in a temporary variable to handle them in the restoration loop
                        $originalAllocations = $payment->invoice_allocations; 
                    }
                }
            }

            // Generate return number using static method directly
            $returnNumber = NumberGeneratorService::generate(
                'cheque_return',
                $user->company_code,
                $user->section_code ?? 'MAIN' // Fallback if section code is null
            );

            // Optional: Create transaction in trn_mas for cheque return (if table exists and customer has account)
            $trnKy = null;
            $chequeReturn = null;
            if ($customerAccount) {
                try {
                    // Check if trn_mas table exists by attempting to query it
                    $maxTrnNo = TrnMas::where('company_code', $user->company_code)->max('TrnNo') ?? 0;
                    $trnNo = (int) $maxTrnNo + 1;

                    // Find customer address for AdrKy
                    $customerAddress = Address::where('AccKy', $customerAccount->AccKy)->first();
                    $adrKy = $customerAddress ? $customerAddress->AdrKy : $customerAccount->AccKy;

                    $trnMasData = [
                        'company_code' => $user->company_code,
                        'section_code' => $user->section_code,
                        'TrnDt' => $request->return_date,
                        'TrnNo' => $trnNo,
                        'TrnTypKy' => 5, // Cheque return transaction type
                        'Amt' => abs($originalCheque->Amt),
                        'AdrKy' => $adrKy,
                        'AccKy' => $customerAccount->AccKy,
                        'Des' => 'Cheque Return: ' . $request->return_reason,
                        'EntUsr' => (int) $user->id,
                        'EntDtm' => now(),
                        'Status' => 'A',
                        'fnAct' => true,
                    ];

                    $trnMas = TrnMas::create($trnMasData);
                    $trnKy = $trnMas ? $trnMas->TrnKy : null;
                } catch (\Exception $e) {
                    // TrnMas table doesn't exist or error occurred, continue without it
                    Log::warning('TrnMas creation skipped: ' . $e->getMessage());
                }
            }

            // Create cheque return transaction in acc_trn (if customer has account)
            if ($customerAccount) {
                $returnData = [
                    'TrnKy' => $trnKy, // Optional, may be null if TrnMas doesn't exist
                    'FInAct' => true,
                    'Status' => 'A',
                    'AccKy' => $customerAccount->AccKy,
                    'TrnDt' => $request->return_date,
                    'TrnNo' => $returnNumber,
                    'Amt' => abs($originalCheque->Amt), // Positive amount to increase customer balance
                    'VaucherNo' => $returnNumber,
                    'Reason' => ($sourceType === 'delivery' ? 'Cheque Return (Delivery): ' : 'Cheque Return: ') . $request->return_reason,
                    'Dec' => 'Cheque Return - Original Cheque: ' . $originalCheque->ChqueNo,
                    'company_code' => $user->company_code,
                    'section_code' => $user->section_code, // Use section code
                    'customer_code' => $originalCheque->customer_code,
                    'customer_name' => $originalCheque->customer_name,
                    'ChqueNo' => $originalCheque->ChqueNo, // Reference original cheque number
                    'BankNm' => $originalCheque->BankNm,
                    'BranchNm' => $originalCheque->BranchNm,
                    'original_payment_id' => $sourceType === 'acc_trn' ? $originalCheque->AccTrnKy : null, // Link to original payment when available
                ];
                if ($sourceType === 'sales' && $originalSale) {
                    $returnData['Dec'] = 'Cheque Return - Original Sale Invoice: ' . $originalSale->invoice_no . ', Cheque: ' . $originalCheque->ChqueNo;
                }

                $chequeReturn = AccTrn::create($returnData);
                if (!$chequeReturn) {
                    throw new \Exception('Failed to create cheque return record');
                }
            }

            $chequeAmount  = abs($originalCheque->Amt);
            $serviceCharge = (float) ($request->service_charge ?? 0);

            // ── Mark original cheque row as returned (within the same locked tx) ──
            // This is the primary race-condition guard: any concurrent request that
            // holds a lockForUpdate on this row will now re-read FReturn=true and
            // abort before creating a duplicate return entry.
            if ($sourceType === 'acc_trn' && $originalCheque instanceof AccTrn) {
                $originalCheque->update([
                    'FReturn' => true,
                    'RtnDt'   => now(),
                ]);
            } elseif ($sourceType === 'delivery' && isset($originalCheque->delivery_payment)) {
                $deliveryPayment = $originalCheque->delivery_payment;

                if ($deliveryPayment->is_deposited && $deliveryPayment->deposit_bank_id) {
                    $bankAccount = BankAccount::lockForUpdate()->find($deliveryPayment->deposit_bank_id);
                    if ($bankAccount) {
                        $bankAccount->current_balance -= abs((float) $deliveryPayment->amount);
                        $bankAccount->save();
                        
                        Log::info('Reversed bank balance for returned delivery cheque', [
                            'cheque_no' => $deliveryPayment->cheque_no,
                            'bank_id' => $deliveryPayment->deposit_bank_id,
                            'amount' => abs((float) $deliveryPayment->amount)
                        ]);
                    }
                }

                $deliveryPayment->update([
                    'status' => 'bounced',
                    'bounced_at' => $request->return_date,
                    'service_charge' => $serviceCharge,
                ]);

                // If there is a service charge, create a new payment record (as a negative payment/charge)
                // so that it increases the delivery's outstanding balance.
                if ($serviceCharge > 0) {
                    \App\Models\DeliveryPayment::create([
                        'delivery_id' => $deliveryPayment->delivery_id,
                        'amount' => -1 * abs($serviceCharge),
                        'method' => 'service_charge',
                        'status' => 'cleared', // Charges are effectively "cleared" debt
                        'payment_date' => $request->return_date,
                        'notes' => 'Cheque Return Service Charge (Cheque: ' . $deliveryPayment->cheque_no . ')',
                        'recorded_by' => $user->id,
                        'company_code' => $user->company_code,
                        'related_payment_id' => $deliveryPayment->id,
                    ]);
                }
            }

            // ── Service charge AccTrn entry ──────────────────────────────────
            if ($serviceCharge > 0 && $customerAccount) {
                // NOTE: do NOT set original_payment_id here — the UNIQUE constraint on that
                // column is already used by the main return row above. Link is via TrnNo suffix.
                AccTrn::create([
                    'TrnKy'         => $trnKy,
                    'FInAct'        => true,
                    'Status'        => 'A',
                    'AccKy'         => $customerAccount->AccKy,
                    'TrnDt'         => $request->return_date,
                    'TrnNo'         => $returnNumber . '-SC',
                    'Amt'           => $serviceCharge,
                    'VaucherNo'     => $returnNumber . '-SC',
                    'Reason'        => 'Cheque Return Service Charge',
                    'Dec'           => 'Service charge for returned cheque: ' . $originalCheque->ChqueNo,
                    'company_code'  => $user->company_code,
                    'section_code'  => $user->section_code,
                    'customer_code' => $originalCheque->customer_code,
                    'customer_name' => $originalCheque->customer_name,
                    'ChqueNo'       => $originalCheque->ChqueNo,
                    'BankNm'        => $originalCheque->BankNm,
                    'BranchNm'      => $originalCheque->BranchNm,
                ]);
            }

            // ── Restore ServiceJob / SalesTransaction outstanding balances ──
            // Priority: 1. Explicit allocations from original payment, 2. Fallback FIFO for remainder
            if ($customerAccount) {
                $accKy = $customerAccount->AccKy;
                $customerAddress2 = Address::where('AccKy', $accKy)->first();
                $adrKy = $customerAddress2 ? $customerAddress2->AdrKy : null;

                $chequeAmount  = abs($originalCheque->Amt);
                $serviceCharge = (float) ($request->service_charge ?? 0);
                $remaining     = $chequeAmount + $serviceCharge;

                // 1. Restore specific targets from the original payment record
                $payment = null;
                if ($originalCheque->original_payment_id) {
                    $payment = CustomerPayment::find($originalCheque->original_payment_id);
                } elseif ($originalCheque->ChqueNo) {
                    // Fallback to match payment by cheque details since original_payment_id is omitted by design
                    $payments = CustomerPayment::where('cheque_no', $originalCheque->ChqueNo)
                        ->where('amount', abs($originalCheque->Amt))
                        ->where(function($q) use ($accKy, $adrKy) {
                            $q->where('customer_id', $accKy);
                            if ($adrKy) $q->orWhere('customer_id', $adrKy);
                        })
                        ->get();

                    if ($payments->count() > 0) {
                        // Find the one closest in time to the AccTrn record
                        $payment = $payments->sortBy(function($p) use ($originalCheque) {
                            return abs($p->created_at->diffInSeconds($originalCheque->created_at));
                        })->first();
                    }
                }

                if ($payment) {
                    // 1a. Handle Single Service Job Target
                    if ($payment->service_job_id && $remaining > 0) {
                        $job = ServiceJob::lockForUpdate()->find($payment->service_job_id);
                        if ($job) {
                            $maxCap = (float) $job->total_amount - (float) $job->advanced_payment;
                            $canRestore = $maxCap - (float) $job->balance_amount;
                            // We only restore up to what this specific payment provided
                                $allocatedToJob = (float) $payment->amount; 
                                $restoreAmount = min($remaining, $canRestore, $allocatedToJob);
                                
                                if ($restoreAmount > 0) {
                                    $job->balance_amount = (float) $job->balance_amount + $restoreAmount;
                                    if ($job->status === 'completed' && (float) $job->balance_amount > 0) {
                                        $job->status = 'in_progress';
                                    }
                                    $job->save();
                                    $remaining -= $restoreAmount;
                                }
                            }
                        }

                        // 1b. Handle Multiple Invoice Allocations
                        if (!empty($payment->invoice_allocations) && is_array($payment->invoice_allocations) && $remaining > 0) {
                            foreach ($payment->invoice_allocations as $alloc) {
                                if ($remaining <= 0) break;
                                $invId = (int) ($alloc['invoice_id'] ?? 0);
                                $allocatedAmt = (float) ($alloc['amount'] ?? 0);
                                
                                if ($invId > 0 && $allocatedAmt > 0) {
                                    $inv = SalesTransaction::lockForUpdate()->find($invId);
                                    if ($inv) {
                                        $maxRestore = (float) $inv->total_amount - (float) $inv->balance_amount;
                                        $restoreAmount = min($remaining, $maxRestore, $allocatedAmt);
                                        
                                        if ($restoreAmount > 0) {
                                            $inv->balance_amount = (float) $inv->balance_amount + $restoreAmount;
                                            $inv->status = 'partially_paid';
                                            $inv->save();
                                            $remaining -= $restoreAmount;
                                        }
                                    }
                                }
                            }
                        }

                        // 1c. Handle Single Sales Transaction ID
                        if ($payment->sales_transaction_id && $remaining > 0) {
                            $inv = SalesTransaction::lockForUpdate()->find($payment->sales_transaction_id);
                            if ($inv) {
                                $maxRestore = (float) $inv->total_amount - (float) $inv->balance_amount;
                                $allocatedToInv = (float) $payment->amount;
                                $restoreAmount = min($remaining, $maxRestore, $allocatedToInv);
                                
                                if ($restoreAmount > 0) {
                                    $inv->balance_amount = (float) $inv->balance_amount + $restoreAmount;
                                    $inv->status = 'partially_paid';
                                    $inv->save();
                                    $remaining -= $restoreAmount;
                                }
                            }
                        }
                    }

                // 2. Fallback: Restore any remaining amount (like service charges) using FIFO
                if ($remaining > 0.01) {
                    // Restore service job balances (oldest first)
                    $jobs = ServiceJob::where('AccKy', $accKy)
                        ->whereColumn('balance_amount', '<', \DB::raw('(total_amount - advanced_payment)'))
                        ->orderBy('created_at', 'asc')
                        ->lockForUpdate()
                        ->get();

                    foreach ($jobs as $job) {
                        if ($remaining <= 0.01) break;
                        $maxCap = (float) $job->total_amount - (float) $job->advanced_payment;
                        $maxRestore = $maxCap - (float) $job->balance_amount;
                        if ($maxRestore <= 0) continue;

                        $restoreAmount = min($remaining, $maxRestore);
                        $job->balance_amount = (float) $job->balance_amount + $restoreAmount;
                        if ($job->status === 'completed' && (float) $job->balance_amount > 0) {
                            $job->status = 'in_progress';
                        }
                        $job->save();
                        $remaining -= $restoreAmount;
                    }

                    // Restore sales transaction balances (oldest first)
                    if ($remaining > 0.01 && $adrKy) {
                        $invoices = SalesTransaction::where('customer_id', $adrKy)
                            ->whereColumn('balance_amount', '<', 'total_amount')
                            ->orderBy('transaction_date', 'asc')
                            ->lockForUpdate()
                            ->get();

                        foreach ($invoices as $invoice) {
                            if ($remaining <= 0.01) break;
                            $maxRestore = (float) $invoice->total_amount - (float) $invoice->balance_amount;
                            if ($maxRestore <= 0) continue;

                            $restoreAmount = min($remaining, $maxRestore);
                            $invoice->balance_amount = (float) $invoice->balance_amount + $restoreAmount;
                            $invoice->status = 'partially_paid';
                            $invoice->save();
                            $remaining -= $restoreAmount;
                        }
                    }
                }

                // ── Update AccMas.CurBal via SUM of all AccTrn ──────────────────
                $newBalance = AccTrn::where('AccKy', $accKy)
                    ->where('FInAct', true)
                    ->where('Status', 'A')
                    ->sum('Amt');

                $customerAccount->update(['CurBal' => $newBalance]);
            }

            // ── Reverse Bank Balance and Mark Payment as Returned ───────────
            $paymentToUpdate = null;
            if ($sourceType === 'acc_trn' && $originalCheque->original_payment_id) {
                $paymentToUpdate = CustomerPayment::find($originalCheque->original_payment_id);
            } elseif ($sourceType === 'sales' && $originalSale) {
                // Find the specific cheque payment record for this sale
                $paymentToUpdate = CustomerPayment::where('sales_transaction_id', $originalSale->id)
                    ->where('method', 'cheque')
                    ->where('cheque_no', $originalCheque->ChqueNo)
                    ->first();
            }

            if ($paymentToUpdate) {
                if ($paymentToUpdate->is_deposited && $paymentToUpdate->deposit_bank_id) {
                    $bankAccount = BankAccount::lockForUpdate()->find($paymentToUpdate->deposit_bank_id);
                    if ($bankAccount) {
                        $bankAccount->current_balance -= $chequeAmount;
                        $bankAccount->save();
                        
                        Log::info('Reversed bank balance for returned cheque', [
                            'cheque_no' => $originalCheque->ChqueNo,
                            'bank_id' => $paymentToUpdate->deposit_bank_id,
                            'amount' => $chequeAmount
                        ]);
                    }
                }
                
                // Update payment status to returned
                $paymentToUpdate->update(['status' => 'returned']);
            }

            DB::commit();

            Log::info('Cheque return processed successfully', [
                'original_cheque_id' => $originalCheque->AccTrnKy,
                'source_type'        => $sourceType,
                'source_sale_id'     => $originalSale?->id,
                'return_id'          => $chequeReturn?->AccTrnKy,
                'customer_code'      => $originalCheque->customer_code,
                'cheque_no'          => $originalCheque->ChqueNo,
                'amount'             => $chequeAmount,
                'service_charge'     => $serviceCharge,
                'user_id'            => $user->id,
            ]);

            return response()->json([
                'success'        => true,
                'message'        => 'Cheque return processed successfully',
                'return_number'  => $returnNumber,
                'return_amount'  => $chequeAmount,
                'service_charge' => $serviceCharge,
            ]);

        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            
            // Check if it's a unique constraint violation (duplicate return)
            if ($e->getCode() === '23000' && str_contains($e->getMessage(), 'unique_active_return_per_payment')) {
                Log::warning('Duplicate cheque return attempt prevented by database constraint', [
                    'cheque_id' => $request->cheque_id,
                    'user_id' => $user ? $user->id : null,
                    'error' => $e->getMessage()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'This cheque has already been returned by another user. Please refresh and try again.'
                ], 409); // Conflict status code
            }
            
            // For other database exceptions, fall through to general exception handler
            Log::error('Database error during cheque return', [
                'error' => $e->getMessage(),
                'cheque_id' => $request->cheque_id,
                'user_id' => $user ? $user->id : null
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Database error occurred: ' . $e->getMessage()
            ], 500);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Cheque return failed', [
                'error' => $e->getMessage(),
                'cheque_id' => $request->cheque_id,
                'user_id' => $user ? $user->id : null
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process cheque return: ' . $e->getMessage()
            ], 500);
        }
    }
}
