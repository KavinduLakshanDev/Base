# Customer Credit Application Logic

This document explains the complete lifecycle of how a customer's Credit (CR) balance is accumulated, how it is applied during a sale, and how it is tracked on the backend without corrupting the running balance.

---

## 1. How a CR Balance is Created

A CR (Credit) balance happens when a customer has paid more than they owe, or when they return items. 
The system calculates the customer's overall balance dynamically using `Customer->calculateOutstandingBalance()`.

```php
Outstanding = (Total Billed + Total Debits) - (Total Paid + Total Returns)
```
If `Outstanding < 0`, the customer has a **CR Balance**. 
*(e.g., They gave Rs 15,000 cash for a future purchase. `Outstanding = 0 - 15000 = -15000`)*

---

## 2. Frontend: Applying Credit at POS (Sales)

When making a new sale, the frontend checks if the customer has a CR balance.

**Files:** `PaymentTotalsSection.tsx` & `Create.tsx`

1. **Detection:** The system checks `selectedCustomer.outstanding_balance < 0`.
2. **Display Panel:** If true, the "Apply Credit Balance" panel becomes visible at the bottom of the payment totals.
3. **Application:** When the user clicks **"Apply Credit"**, the system sets the `credit_used` state variable:
   `creditToApply = Math.min(availableCredit, invoiceTotal);`
4. **Calculations:** 
   - `credit_used` is added to `totalPaid`.
   - The invoice's `balance` is reduced by `credit_used`.
5. **Payment Mode:** The standard Payment Mode radio buttons (Cash, Card, etc.) do NOT need to change. The `credit_used` field is sent to the backend independently.

---

## 3. Backend: Saving the Sale

When the sale is saved, `SalesController.php` processes the `credit_used`.

1. **Discount Logic:** The system checks if the invoice is fully settled. 
   `$hasCreditContext = $balance > 0;`
   If the invoice is fully paid (even if paid entirely by `credit_used`), discounts are permitted. It only restricts discounts if there is an *unpaid* balance.
2. **Invoice Record:** Saves the `SalesTransaction`, storing `credit_applied => $creditUsed` in the `payment_details` JSON block.
3. **Internal Transfer (Crucial Step):** 
   ```php
   if ($creditUsed > 0) {
       CustomerPayment::create([
           'method' => 'credit_applied',
           'amount' => $creditUsed,
           // ...
       ]);
   }
   ```
   The system creates a new `CustomerPayment` specifically with the method `credit_applied`. This acts as the bridge connecting the previous cash overpayment to this specific invoice.

---

## 4. Backend: Ledger & Balance Mathematics

This is where the logic must be very precise to prevent "double-counting".

### The Problem of Double Counting
If a customer overpaid Rs 15,000 in cash previously, that cash was already counted as a payment.
If we count the `credit_applied` transaction as a *second* payment, the system would think the customer paid Rs 30,000, artificially inflating their CR balance!

### The Solution (`Customer.php` & `CustomerLedgerController.php`)
1. **Total Outstanding Exclusion:**
   In `calculateOutstandingBalance()`, the system completely ignores these internal transfers:
   ```php
   ->whereNotIn('method', ['applied_credit', 'credit_applied', 'exchange_balance_due'])
   ```
2. **Ledger Opening Balance Exclusion:**
   In `CustomerLedgerController`, the opening balance calculation strictly excludes them so the starting CR balance is accurate.
3. **Ledger Display Trick:**
   The user still needs to *see* that the credit was applied on the ledger card. We fetch these records separately and format them specially:
   - **Description:** `Credit Balance Applied (15,000.00)`
   - **Debit:** `0.00`
   - **Credit:** `0.00`
   
   By setting the debit and credit to exactly `0`, the row appears visually on the ledger on the exact chronological timestamp (`created_at`), but it has absolutely **zero mathematical effect** on the running balance calculation.
