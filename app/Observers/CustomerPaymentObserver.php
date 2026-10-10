<?php

namespace App\Observers;

use App\Models\CustomerPayment;
use App\Models\SalesTransaction;

/**
 * CustomerPaymentObserver
 *
 * Keeps SalesTransaction.balance_amount always in sync with actual payments.
 * Every time a payment is created, updated, or deleted, this observer
 * recomputes balance_amount for any affected invoice from scratch using
 * the real data in customer_payments — so it can never drift out of sync.
 */
class CustomerPaymentObserver
{
    /**
     * After a payment is saved (created or updated), resync all affected invoices.
     */
    public function saved(CustomerPayment $payment): void
    {
        $this->syncAffectedInvoices($payment);
    }

    /**
     * After a payment is deleted, restore the balance on affected invoices.
     */
    public function deleted(CustomerPayment $payment): void
    {
        $this->syncAffectedInvoices($payment);
    }

    /**
     * Collect every SalesTransaction invoice_id touched by this payment
     * and recompute each one's balance_amount from scratch.
     */
    private function syncAffectedInvoices(CustomerPayment $payment): void
    {
        $invoiceIds = collect();

        // Direct single-invoice link
        if (!empty($payment->sales_transaction_id)) {
            $invoiceIds->push((int)$payment->sales_transaction_id);
        }

        // Multi-invoice allocations — skip opening-balance (invoice_id = 0)
        if (!empty($payment->invoice_allocations) && is_array($payment->invoice_allocations)) {
            foreach ($payment->invoice_allocations as $alloc) {
                $id = (int)($alloc['invoice_id'] ?? 0);
                if ($id > 0) {
                    $invoiceIds->push($id);
                }
            }
        }

        // Recompute balance for each unique invoice
        foreach ($invoiceIds->unique() as $invoiceId) {
            SalesTransaction::recalculateBalance($invoiceId);
        }
    }
}
