<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\DeliveryPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryPaymentController extends Controller
{
    /**
     * Record a new payment against a delivery.
     */
    public function store(Request $request, Delivery $delivery)
    {
        if (!request()->user()->hasPermission('deliveries.payments.create') &&
            !request()->user()->hasPermission('deliveries.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to record payments.');
        }

        $companyCode = request()->user()->company_code;
        if ($delivery->company_code !== $companyCode) {
            abort(404);
        }

        // Validate first (outside transaction for fast fail)
        $deliveryForValidation = Delivery::with(['items', 'payments'])->findOrFail($delivery->id);
        $outstanding = $deliveryForValidation->outstanding_balance;

        $request->validate([
            'amount'       => ['required', 'numeric', 'min:0.01'],
            'method'       => 'required|in:cash,cheque,transfer,card',
            'bank_account_id' => 'required_if:method,transfer|required_if:method,card|nullable|exists:bank_accounts,id',
            'reference_no' => 'required_if:method,cheque|nullable|string|max:100',
            'bank_name'    => 'required_if:method,cheque|nullable|string|max:100',
            'branch'       => 'required_if:method,cheque|nullable|string|max:100',
            'payment_date' => 'required|date',
            'notes'        => 'nullable|string|max:500',
            'allocations'  => 'nullable|array',
            'allocations.*.delivery_id' => 'required|exists:deliveries,id',
            'allocations.*.amount'      => 'required|numeric|min:0',
        ]);

        $totalAllocated = 0;
        if ($request->has('allocations') && count($request->allocations) > 0) {
            foreach ($request->allocations as $alloc) {
                $totalAllocated += (float)$alloc['amount'];
            }
            
            // Only enforce matching for non-cheque payments (cash/transfer)
            if ($request->method !== 'cheque' && abs($totalAllocated - (float)$request->amount) > 0.01) {
                return redirect()->back()->withErrors(['amount' => 'Total allocated amount must match the payment amount for ' . $request->method . ' payments.']);
            }
        }

        // Pessimistic lock inside transaction to prevent race conditions
        $primaryPaymentId = DB::transaction(function () use ($request, $delivery, $companyCode) {
            // 1. Update bank account balance if transfer or card
            if (in_array($request->method, ['transfer', 'card']) && $request->bank_account_id) {
                $bankAccount = \App\Models\BankAccount::lockForUpdate()->find($request->bank_account_id);
                if ($bankAccount) {
                    $bankAccount->increment('current_balance', (float) $request->amount);
                }
            }

            // 2. Process Allocations
            $allocations = (!empty($request->allocations)) ? $request->allocations : [
                ['delivery_id' => $delivery->id, 'amount' => $request->amount]
            ];

            $mainPayment = null;

            foreach ($allocations as $alloc) {
                if ((float)$alloc['amount'] <= 0) continue;

                $targetDelivery = Delivery::lockForUpdate()->findOrFail($alloc['delivery_id']);
                
                $payment = DeliveryPayment::create([
                    'delivery_id'        => $targetDelivery->id,
                    'amount'             => $alloc['amount'],
                    'method'             => $request->method,
                    'cheque_no'          => $request->method === 'cheque' ? $request->reference_no : null,
                    'status'             => 'cleared',
                    'reference_no'       => $request->method !== 'cheque' ? $request->reference_no : null,
                    'bank_account_id'    => $request->bank_account_id,
                    'bank_name'          => $request->bank_name,
                    'branch'             => $request->branch,
                    'payment_date'       => $request->payment_date,
                    'notes'              => $request->notes,
                    'recorded_by'        => request()->user()->id,
                    'company_code'       => $companyCode,
                ]);

                if (!$mainPayment) $mainPayment = $payment;
            }

            if ($mainPayment) {
                // 3. Update FinanceAccount if any cash payment was made
                $totalCashAmount = collect($allocations)->sum(function($alloc) use ($request) {
                    return $request->method === 'cash' ? (float)$alloc['amount'] : 0;
                });
                
                if ($totalCashAmount > 0) {
                    $sectionCode = request()->user()->section_code ?? 'VIS-SEC-001';
                    $deliverySalesAccount = \App\Models\FinanceAccount::where('account_name', 'like', '%Delivery Sales%')
                        ->where('section_code', $sectionCode)
                        ->lockForUpdate()
                        ->first() ?? \App\Models\FinanceAccount::find(41); // Fallback to Delivery Sales ID 41

                    if ($deliverySalesAccount) {
                        if (in_array($deliverySalesAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                            $deliverySalesAccount->current_balance -= $totalCashAmount;
                        } else {
                            $deliverySalesAccount->current_balance += $totalCashAmount;
                        }
                        $deliverySalesAccount->save();
                        
                        $deliveryNos = \App\Models\Delivery::whereIn('id', array_column($allocations, 'delivery_id'))->pluck('delivery_number')->toArray();
                        $deliveryNosText = '';
                        if (!empty($deliveryNos)) {
                            $deliveryNosText = ' (Deliveries: ' . implode(', ', array_unique($deliveryNos)) . ')';
                        }
                        
                        \App\Models\FinanceAccountTransaction::create([
                            'finance_account_id' => $deliverySalesAccount->id,
                            'date' => now(),
                            // 'source_type' => \App\Models\DeliveryPayment::class,
                            'source_type' => 'Delivery Cash Payment',
                            'source_id' => $mainPayment->id,
                            'description' => 'Delivery payment' . $deliveryNosText,
                            'method' => 'cash',
                            'type' => 'debit',
                            'amount' => $totalCashAmount,
                            'reference' => !empty($deliveryNos) ? implode(', ', array_unique($deliveryNos)) : 'N/A',
                        ]);
                    }
                }

                session()->flash('payment_id', $mainPayment->id);
                return $mainPayment->id;
            }
            
            return null;
        });

        return redirect()->back()->with('success', 'Bulk payment recorded successfully.');
    }

    /**
     * Delete a previously recorded payment.
     */
    public function destroy(Delivery $delivery, DeliveryPayment $payment)
    {
        if (!request()->user()->hasPermission('deliveries.payments.delete') &&
            !request()->user()->hasPermission('deliveries.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete payments.');
        }

        $companyCode = request()->user()->company_code;
        if ($delivery->company_code !== $companyCode || $payment->delivery_id !== $delivery->id) {
            abort(404);
        }

        DB::transaction(function () use ($payment) {
            // Reverse bank balance if it was a transfer or card
            if (in_array($payment->method, ['transfer', 'card']) && $payment->bank_account_id) {
                $bankAccount = \App\Models\BankAccount::lockForUpdate()->find($payment->bank_account_id);
                if ($bankAccount) {
                    $bankAccount->decrement('current_balance', (float) $payment->amount);
                }
            }
            // Reverse finance cash account balance if it was a cash payment
            if ($payment->method === 'cash') {
                $mainCashAccount = \App\Models\FinanceAccount::where('company_code', $companyCode)
                    ->where('account_type', 'cash')
                    ->lockForUpdate()
                    ->first();
                if ($mainCashAccount) {
                    $mainCashAccount->current_balance -= (float) $payment->amount;
                    $mainCashAccount->save();
                    
                    \App\Models\FinanceAccountTransaction::create([
                        'finance_account_id' => $mainCashAccount->id,
                        'date' => now(),
                        // 'source_type' => \App\Models\DeliveryPayment::class,
                        'source_type' => 'Delivery Bulk Payment',
                        'source_id' => $payment->id,
                        'description' => 'Delivery bulk payment reversed',
                        'method' => 'cash',
                        'type' => 'credit',
                        'amount' => (float) $payment->amount,
                        'reference' => 'N/A',
                    ]);
                }
            }
            $payment->delete();
        });

        return redirect()->back()->with('success', 'Payment deleted.');
    }

    /**
     * Mark a pending cheque payment as cleared (funds confirmed in bank).
     */
    public function clear(Delivery $delivery, DeliveryPayment $payment)
    {
        if (!request()->user()->hasPermission('deliveries.payments.create') &&
            !request()->user()->hasPermission('deliveries.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $companyCode = request()->user()->company_code;
        if ($delivery->company_code !== $companyCode || $payment->delivery_id !== $delivery->id) {
            abort(404);
        }

        if ($payment->method !== 'cheque' || $payment->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending cheque payments can be cleared.');
        }

        DB::transaction(function () use ($payment) {
            // Re-fetch with a lock to prevent double-clear race conditions
            $locked = DeliveryPayment::lockForUpdate()->findOrFail($payment->id);

            if ($locked->status !== 'pending') {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'payment' => ['This cheque has already been cleared or bounced.'],
                ]);
            }

            $locked->status = 'cleared';
            $locked->save();
        });

        return redirect()->back()->with('success', 'Cheque marked as cleared.');
    }


    /**
     * Print a receipt for a single payment.
     */
    public function receipt(Delivery $delivery, DeliveryPayment $payment)
    {
        if (!request()->user()->hasPermission('deliveries.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $companyCode = request()->user()->company_code;
        if ($delivery->company_code !== $companyCode || $payment->delivery_id !== $delivery->id) {
            abort(404);
        }

        $delivery->load(['items', 'deliveryRoute', 'assignedUser', 'payments', 'shop']);
        $payment->load('recordedBy');

        // Fetch all outstanding deliveries for this customer (similar to DeliveryController logic)
        $query = \App\Models\Delivery::where('company_code', $companyCode);

        // Identify customer by Shop ID, or fallback to Phone Number
        if ($delivery->shop_id) {
            $query->where('shop_id', $delivery->shop_id);
        } elseif ($delivery->customer_phone) {
            $query->whereNull('shop_id')->where('customer_phone', $delivery->customer_phone);
        } else {
            $query->where('id', $delivery->id);
        }

        // We only care about deliveries that *might* have outstanding balance.
        $candidates = $query->where('status', '!=', 'cancelled')
            ->with(['items', 'payments']) // Eager load for accessors
            ->get();

        $outstandingDeliveries = $candidates->filter(function($d) {
            return $d->outstanding_balance > 0.005; // Filter > 0 with tolerance
        });

        return view('deliveries.payment_receipt', compact('delivery', 'payment', 'outstandingDeliveries'));
    }
}
