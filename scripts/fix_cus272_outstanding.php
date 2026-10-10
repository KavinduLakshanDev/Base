<?php
/**
 * FIX: CUS272 (S.M.S. Faizal) outstanding double-counting issue
 *
 * Problem:
 *   - PAY-325 (ID:325, Rs 10,000) has sales_transaction_id = NULL (not linked to VIS-PRI-000346)
 *   - VIS-PRI-000346 (ID:9918) has balance_amount = Rs 10,000 AND applied_credit = Rs 10,000
 *   - calculateOutstandingBalance() subtracts PAY-325 via totalPaid AND applied_credit again → -10,000 credit shown
 *
 * Fix:
 *   1. Link PAY-325 → VIS-PRI-000346 (set sales_transaction_id = 9918)
 *   2. Set VIS-PRI-000346 balance_amount = 0 (108,250 - 98,250 - 10,000 = 0)
 *   3. Remove applied_credit from payment_details (since PAY-325 is now a proper linked payment)
 */

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CustomerPayment;
use App\Models\SalesTransaction;
use Illuminate\Support\Facades\DB;

$paymentId  = 325;   // PAY-325
$invoiceId  = 9918;  // VIS-PRI-000346

echo "=== PRE-FIX STATE ===\n";
$pay = CustomerPayment::findOrFail($paymentId);
$inv = SalesTransaction::findOrFail($invoiceId);

echo "PAY-325   sales_transaction_id : " . ($pay->sales_transaction_id ?? 'NULL') . "\n";
echo "VIS-PRI-000346 balance_amount  : Rs " . number_format($inv->balance_amount, 2) . "\n";
$details = is_array($inv->payment_details) ? $inv->payment_details : json_decode($inv->payment_details, true);
echo "VIS-PRI-000346 applied_credit  : Rs " . number_format((float)($details['applied_credit'] ?? 0), 2) . "\n\n";

// --- Verify math before proceeding ---
$invoiceTotal = (float) $inv->total_amount;       // 108,250
$paid3607     = 98250.00;                          // PAY-3607 already linked
$paid325      = (float) $pay->amount;              // 10,000
$expectedBal  = $invoiceTotal - $paid3607 - $paid325; // should be 0

echo "Verification: $invoiceTotal - $paid3607 - $paid325 = $expectedBal\n";
if (abs($expectedBal) > 0.01) {
    echo "❌ Expected balance is not 0! Aborting.\n";
    exit(1);
}
echo "✅ Math checks out. Proceeding with fix...\n\n";

DB::beginTransaction();
try {
    // Step 1: Link PAY-325 to invoice VIS-PRI-000346
    $pay->sales_transaction_id = $invoiceId;
    $pay->save();
    echo "✅ Step 1: PAY-325 → linked to invoice ID $invoiceId\n";

    // Step 2: Zero out invoice balance_amount
    $inv->balance_amount = 0;

    // Step 3: Remove applied_credit from payment_details to avoid double-count
    if (!is_array($details)) {
        $details = json_decode($details, true) ?? [];
    }
    unset($details['applied_credit']);
    $inv->payment_details = $details;
    $inv->save();
    echo "✅ Step 2: VIS-PRI-000346 balance_amount → 0\n";
    echo "✅ Step 3: applied_credit removed from payment_details\n";

    DB::commit();
    echo "\n=== POST-FIX STATE ===\n";
    $pay->refresh();
    $inv->refresh();
    echo "PAY-325   sales_transaction_id : " . ($pay->sales_transaction_id ?? 'NULL') . "\n";
    echo "VIS-PRI-000346 balance_amount  : Rs " . number_format($inv->balance_amount, 2) . "\n";
    $newDetails = is_array($inv->payment_details) ? $inv->payment_details : json_decode($inv->payment_details, true);
    echo "VIS-PRI-000346 applied_credit  : Rs " . number_format((float)($newDetails['applied_credit'] ?? 0), 2) . "\n";

    echo "\n=== RECALCULATED OUTSTANDING ===\n";
    $customer = \App\Models\Customer::where('AdrCd', 'CUS272')->first();
    $outstanding = $customer->calculateOutstandingBalance();
    echo "  CUS272 Outstanding Balance : Rs " . number_format($outstanding, 2) . "\n";
    if (abs($outstanding) < 0.01) {
        echo "  ✅ CONFIRMED: Outstanding is now Rs 0.00 — fully settled!\n";
    } else {
        echo "  ⚠️  Outstanding is not zero: Rs " . number_format($outstanding, 2) . "\n";
    }

} catch (\Exception $e) {
    DB::rollBack();
    echo "❌ Error — rolled back: " . $e->getMessage() . "\n";
}
