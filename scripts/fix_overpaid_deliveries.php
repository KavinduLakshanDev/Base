<?php

use App\Models\Delivery;
use App\Models\DeliveryPayment;
use App\Models\FinanceAccount;
use App\Models\FinanceAccountTransaction;
use App\Models\BankAccount;
use Illuminate\Support\Facades\DB;

/**
 * Script to fix historical direct sales records where the recorded cash amount
 * was greater than the actual bill amount.
 * 
 * To run this script, use Laravel Tinker:
 * php artisan tinker --execute="require 'fix_overpaid_deliveries.php';"
 */

DB::beginTransaction();
try {
    $payments = DeliveryPayment::whereHas('delivery', function($q) {
        $q->where('notes', 'Direct sale from vehicle');
    })->with('delivery')->get();

    $fixedCount = 0;

    foreach ($payments as $payment) {
        $delivery = $payment->delivery;
        if (!$delivery || !$delivery->total_amount) continue;

        // Check if recorded payment exceeds the delivery total amount
        if ($payment->amount > $delivery->total_amount) {
            $excessAmount = $payment->amount - $delivery->total_amount;
            $correctAmount = $delivery->total_amount;
            
            echo "Fixing Delivery ID: {$delivery->id} (Payment ID: {$payment->id}) | Was: {$payment->amount}, Should be: {$correctAmount}\n";

            // 1. Fix DeliveryPayment
            $payment->amount = $correctAmount;
            $payment->save();

            // 2. Fix Finance / Bank Accounts depending on payment method
            if ($payment->method === 'cash') {
                // Find and fix the corresponding FinanceAccountTransaction
                $transaction = FinanceAccountTransaction::where('source_type', 'Direct Delivery Payment')
                    ->where('source_id', $delivery->id)
                    ->first();
                
                if ($transaction) {
                    $transaction->amount = $correctAmount;
                    $transaction->save();
                    
                    // Fix the main FinanceAccount (Cash Book) balance by subtracting the excess
                    $financeAccount = FinanceAccount::find($transaction->finance_account_id);
                    if ($financeAccount) {
                        $financeAccount->current_balance -= $excessAmount;
                        $financeAccount->save();
                    }
                }
            } else if (in_array($payment->method, ['transfer', 'card']) && $payment->bank_account_id) {
                // For non-cash payments, fix the BankAccount balance directly
                $bankAccount = BankAccount::find($payment->bank_account_id);
                if ($bankAccount) {
                    $bankAccount->current_balance -= $excessAmount;
                    $bankAccount->save();
                }
            }
            
            $fixedCount++;
        }
    }
    
    DB::commit();
    echo "\nSuccessfully fixed {$fixedCount} records.\n";
} catch (\Exception $e) {
    DB::rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}
