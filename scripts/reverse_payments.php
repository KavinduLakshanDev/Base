<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\SupplierPayment;
use App\Models\Purchase;
use App\Models\FinanceAccountTransaction;
use App\Models\FinanceVoucher;
use App\Models\FinanceAccount;
use App\Models\AccTrn;
use App\Models\Address;
use App\Models\AccMas;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

function recalculateSupplierBalance($adrKy) {
    // Mimic the recalculateSupplierBalance from controller
    $supplier = Address::where('AdrKy', $adrKy)->first();
    if (!$supplier) return;
    
    $accMas = AccMas::where('AccKy', $supplier->AccKy)->first();
    if (!$accMas) return;
    
    $totalDebits = AccTrn::where('AccKy', $accMas->AccKy)
                        ->where('Status', 'A')
                        ->where('Amt', '>', 0)
                        ->sum('Amt');
                        
    $totalCredits = AccTrn::where('AccKy', $accMas->AccKy)
                        ->where('Status', 'A')
                        ->where('Amt', '<', 0)
                        ->sum('Amt');
                        
    $accMas->CurBal = $totalDebits + $totalCredits;
    $accMas->save();
}

$paymentsToReverse = ['SPY-000011', 'SPY-000010', 'SPY-000003'];

foreach ($paymentsToReverse as $paymentNo) {
    echo "Reversing {$paymentNo}...\n";
    $payment = SupplierPayment::where('payment_no', $paymentNo)->first();
    if (!$payment) {
        echo "Payment {$paymentNo} not found.\n";
        continue;
    }

    DB::beginTransaction();
    try {
        // 1. Restore invoice balances
        if (!empty($payment->invoice_allocations)) {
            $allocations = is_string($payment->invoice_allocations) ? json_decode($payment->invoice_allocations, true) : $payment->invoice_allocations;
            foreach ($allocations as $allocation) {
                $invoice = Purchase::where('PurchaseKey', $allocation['invoice_id'])->first();
                if ($invoice) {
                    $invoice->balance_amount = round((float)$invoice->balance_amount + (float)$allocation['amount'], 2);
                    $invoice->save();
                    echo "Restored invoice {$invoice->PurchaseNo} (+{$allocation['amount']})\n";
                }
            }
        }

        // 2. Fix Finance (Cash) balances and delete transactions
        $transactions = FinanceAccountTransaction::where('source_type', 'Supplier Payment')->where('source_id', $payment->id)->get();
        foreach ($transactions as $txn) {
            if ($txn->type === 'credit') { // Money out
                $acc = FinanceAccount::find($txn->finance_account_id);
                if ($acc) {
                    $acc->current_balance += $txn->amount;
                    $acc->save();
                    echo "Restored FinanceAccount {$acc->id} balance (+{$txn->amount})\n";
                }
            }
            
            if ($txn->reference) {
                FinanceVoucher::where('finance_voucher_no', $txn->reference)->delete();
                echo "Deleted FinanceVoucher {$txn->reference}\n";
            }
            $txn->delete();
            echo "Deleted FinanceAccountTransaction\n";
        }

        // 3. Fix Bank Vouchers (if any are orphaned)
        $vouchers = FinanceVoucher::where('description', 'LIKE', '%(Payment No: ' . $paymentNo . ')%')->get();
        foreach ($vouchers as $voucher) {
            $voucher->delete();
            echo "Deleted orphaned FinanceVoucher {$voucher->finance_voucher_no}\n";
        }

        // 4. Delete AccTrn (Accounting Ledger entries)
        $accTrnCount = AccTrn::where('TrnNo', $paymentNo)->delete();
        echo "Deleted {$accTrnCount} AccTrn entries.\n";

        $supplierId = $payment->supplier_id;
        
        // 5. Delete the payment itself
        $payment->delete();
        echo "Deleted SupplierPayment {$paymentNo}.\n";

        // 6. Recalculate supplier ledger balance
        recalculateSupplierBalance($supplierId);
        echo "Recalculated supplier balance.\n";

        DB::commit();
        echo "Successfully reversed {$paymentNo}!\n\n";
    } catch (\Exception $e) {
        DB::rollBack();
        echo "Failed to reverse {$paymentNo}: " . $e->getMessage() . "\n\n";
    }
}
