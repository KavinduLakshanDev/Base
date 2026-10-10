<?php

namespace App\Console\Commands;

// use Illuminate\Console\Command;
// use App\Models\FinanceAccount;
// use App\Models\FinanceAccountTransaction;
// use App\Models\SalesTransaction;
// use App\Models\CustomerPayment;
// use App\Models\DeliveryPayment;
// use App\Models\PettyCashTransaction;
// use App\Models\DeliveryPettyCashTransaction;
// use Carbon\Carbon;
// use DB;

// class MigrateFinanceTransactions extends Command
// {
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    // protected $signature = 'finance:migrate-transactions';

    /**
     * The console command description.
     *
     * @var string
     */
    // protected $description = 'Retroactively generates the FinanceAccountTransaction ledger based on historical records.';

    /**
     * Execute the console command.
     */
    // public function handle()
    // {
    //     $this->info("Starting Finance Transaction Migration...");

    //     DB::transaction(function () {
            // Clear existing transactions
            // FinanceAccountTransaction::query()->delete();

            // $financeAccounts = FinanceAccount::where('account_type', 'cash')->get();

            // foreach ($financeAccounts as $financeAccount) {
            //     $this->info("Processing Finance Account: {$financeAccount->id} (Company: {$financeAccount->company_code})");
                
                // Keep track of expected balance
                // $calculatedBalance = $financeAccount->opening_balance;

                // $sections = \App\Models\Section::where('company_code', $financeAccount->company_code)->pluck('section_code')->toArray();

                // 1. Sales
                // $sales = SalesTransaction::whereIn('section_code', $sections)->where('status', '!=', 'cancelled')->get();
                // foreach ($sales as $sale) {
                //     $cash = (float)($sale->payment_details['cash'] ?? 0);
                //     $change = (float)($sale->payment_details['change'] ?? 0);
                //     $effectiveCash = $cash;
                //     if ($change > 0 && $effectiveCash > 0) {
                //         $effectiveCash -= min($effectiveCash, $change);
                //     }
                //     if ($effectiveCash > 0) {
                //         FinanceAccountTransaction::create([
                //             'finance_account_id' => $financeAccount->id,
                //             'date' => Carbon::parse($sale->transaction_date)->setTime(12, 0, 0),
                //             'source_type' => SalesTransaction::class,
                //             'source_id' => $sale->id,
                //             'description' => 'Sale (Invoice: ' . $sale->invoice_no . ')',
                //             'method' => 'cash',
                //             'type' => 'debit',
                //             'amount' => $effectiveCash,
                //             'reference' => $sale->invoice_no,
                //         ]);
                //         $calculatedBalance += $effectiveCash;
                //     }
                // }

                // 2. Customer Payments
                // $customerPayments = CustomerPayment::select('customer_payments.*')
                //     ->join('address', 'address.AdrKy', '=', 'customer_payments.customer_id')
                //     ->where('address.company_code', $financeAccount->company_code)
                //     ->where('customer_payments.method', 'cash')
                //     ->where('customer_payments.status', 'completed')
                //     ->get();
                
                // foreach ($customerPayments as $cp) {
                //     $invoicesText = '';
                //     $invNos = [];
                    
                //     if (!empty($cp->sales_transaction_id)) {
                //         $invNo = SalesTransaction::where('id', $cp->sales_transaction_id)->value('invoice_no');
                //         if ($invNo) $invNos[] = $invNo;
                //     }
                    
                //     if (!empty($cp->invoice_allocations) && is_array($cp->invoice_allocations)) {
                //         $invIds = array_filter(array_column($cp->invoice_allocations, 'invoice_id'));
                //         if (!empty($invIds)) {
                //             $allocInvNos = SalesTransaction::whereIn('id', $invIds)->pluck('invoice_no')->toArray();
                //             $invNos = array_merge($invNos, $allocInvNos);
                //         }
                //     }
                    
                //     $invNos = array_unique(array_filter($invNos));
                //     if (!empty($invNos)) {
                //         $invoicesText .= ' (Invoices: ' . implode(', ', $invNos) . ')';
                //     }
                    
                //     if (!empty($cp->service_job_id)) {
                //         $sjNo = \App\Models\ServiceJob::where('id', $cp->service_job_id)->value('job_number');
                //         if ($sjNo) {
                //             $invoicesText .= ' (Service Job: ' . $sjNo . ')';
                //         }
                //     }
                
                //     FinanceAccountTransaction::create([
                //         'finance_account_id' => $financeAccount->id,
                //         'date' => Carbon::parse($cp->date)->setTime(12, 1, 0),
                //         'source_type' => CustomerPayment::class,
                //         'source_id' => $cp->id,
                //         'description' => 'Customer Payment (' . ($cp->reference_no ?? 'Cash') . ')' . $invoicesText,
                //         'method' => 'cash',
                //         'type' => 'debit',
                //         'amount' => (float) $cp->amount,
                //         'reference' => $cp->reference_no,
                //     ]);
                //     $calculatedBalance += (float) $cp->amount;
                // }

                // 3. Delivery Payments
                // $deliveryPayments = DeliveryPayment::where('company_code', $financeAccount->company_code)
                //     ->where('method', 'cash')
                //     ->where('status', 'cleared')
                //     ->get();
                
                // foreach ($deliveryPayments as $dp) {
                //     $delNo = \App\Models\Delivery::where('id', $dp->delivery_id)->value('delivery_number');
                //     $delText = $delNo ? ' (Delivery: ' . $delNo . ')' : '';
                    
                //     FinanceAccountTransaction::create([
                //         'finance_account_id' => $financeAccount->id,
                //         'date' => Carbon::parse($dp->payment_date)->setTime(12, 2, 0),
                //         'source_type' => DeliveryPayment::class,
                //         'source_id' => $dp->id,
                //         'description' => 'Delivery Payment' . $delText,
                //         'method' => 'cash',
                //         'type' => 'debit',
                //         'amount' => (float) $dp->amount,
                //         'reference' => null,
                //     ]);
                //     $calculatedBalance += (float) $dp->amount;
                // }

                // 4. Petty Cash Reimbursements
                // $pettyCash = PettyCashTransaction::where('company_code', $financeAccount->company_code)
                //     ->where('type', 'received')
                //     ->get();
                
                // foreach ($pettyCash as $pc) {
                //     FinanceAccountTransaction::create([
                //         'finance_account_id' => $financeAccount->id,
                //         'date' => Carbon::parse($pc->transaction_date)->setTime(12, 3, 0),
                //         'source_type' => PettyCashTransaction::class,
                //         'source_id' => $pc->id,
                //         'description' => 'Petty Cash Reimbursement',
                //         'method' => 'cash',
                //         'type' => 'credit', // Deduction!
                //         'amount' => (float) $pc->amount,
                //         'reference' => null,
                //     ]);
                //     $calculatedBalance -= (float) $pc->amount;
                // }

                // 5. Delivery Petty Cash Reimbursements
                // $deliveryPettyCash = DeliveryPettyCashTransaction::where('company_code', $financeAccount->company_code)
                //     ->where('type', 'received')
                //     ->get();
                
                // foreach ($deliveryPettyCash as $dpc) {
                //     FinanceAccountTransaction::create([
                //         'finance_account_id' => $financeAccount->id,
                //         'date' => Carbon::parse($dpc->transaction_date)->setTime(12, 4, 0),
                //         'source_type' => DeliveryPettyCashTransaction::class,
                //         'source_id' => $dpc->id,
                //         'description' => 'Delivery Petty Cash Reimbursement',
                //         'method' => 'cash',
                //         'type' => 'credit', // Deduction!
                //         'amount' => (float) $dpc->amount,
                //         'reference' => null,
                //     ]);
                //     $calculatedBalance -= (float) $dpc->amount;
                // }

                // Assert Balance matches current balance
//                 $financeAccount->current_balance = $calculatedBalance;
//                 $financeAccount->save();

//                 $this->info("Completed. Verified final balance is: {$calculatedBalance}");
//             }
//         });

//         $this->info("Migration completed successfully.");
//     }
// }
