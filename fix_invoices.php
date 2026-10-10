<?php
$invoices = ["VIS001-000178", "VIS001-000175", "VIS001-000145", "VIS001-000069"];
foreach ($invoices as $inv) {
    list($company, $no) = explode("-", $inv);
    $purchase = App\Models\Purchase::where("company_code", $company)->where("PurchaseNo", (int)$no)->first();
    
    if ($purchase) {
        $payments = App\Models\SupplierPayment::all();
        $totalPaid = 0;
        foreach ($payments as $payment) {
            $allocations = $payment->invoice_allocations;
            if (is_string($allocations)) {
                $allocations = json_decode($allocations, true);
            }
            if (is_array($allocations)) {
                foreach ($allocations as $allocation) {
                    if (isset($allocation['invoice_id']) && $allocation['invoice_id'] == $purchase->PurchaseKey) {
                        $totalPaid += (float)$allocation['amount'];
                    }
                }
            }
        }
        
        $correct_balance = $purchase->TotalVal - $totalPaid;
        echo "Invoice: $inv | TotalVal: {$purchase->TotalVal} | Old Balance: {$purchase->balance_amount} | Correct Balance: {$correct_balance} | Paid: {$totalPaid}\n";
        
        if ($purchase->balance_amount != $correct_balance) {
            $purchase->balance_amount = $correct_balance;
            $purchase->save();
            echo "-> Fixed balance!\n";
        }
    } else {
        echo "Invoice: $inv not found\n";
    }
}
