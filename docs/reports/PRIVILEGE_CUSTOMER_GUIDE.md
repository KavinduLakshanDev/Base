# Privilege Customer Discounts & Sales Workflow

This document explains how Privilege Customer discounts work within the Distribution System Point of Sale (POS), detailing both the frontend logic and the backend payment processing.

## 1. Overview
Privilege customers are special users who are entitled to a flat, global discount on all their purchases. 
To prevent "double-dipping", whenever a Privilege Customer is selected, **all individual product-level discounts are automatically removed**, and instead, the global privilege discount is applied to the entire bill.

The discount percentage is dynamically determined based on their payment method:
* **Cash / Cheque / Bank Transfer**: Uses the standard `privilege_users_discount` percentage defined in the Company Profile.
* **Card Payments**: Uses the specialized `privilege_card_discount` percentage.
* **Credit Payments**: Receives **0%** discount. By design, if a customer takes goods on credit, they do not receive the privilege discount.

---

## 2. Frontend Logic (How it works in the POS)

When the cashier is building an invoice in the POS (`Create.tsx`):

### A. Customer Detection
When you search for and select a customer, the POS hits the backend API (`sales/search/customers`). The API returns a flag `is_privilege_user`. 
If this flag is `true`, the system immediately activates Privilege Mode.

### B. Product Discount Stripping
To ensure the customer does not get both product-level and global discounts:
1. The POS scans the cart (`data.items`).
2. It actively forces `discount_amount = 0` and `discount_percentage = 0` on every single product in the cart.
3. If you add a new item to the cart, its default product discount is ignored.

### C. Dynamic Global Calculation
The POS calculates the Gross Subtotal (total value of all items without any item discounts).
It then checks the **Payment Mode** toggle:
* If the cashier selects **Cash**, it applies the Cash percentage (e.g. 5%) to the Gross Subtotal.
* If the cashier selects **Card**, it instantly recalculates and applies the Card percentage (e.g. 10%) instead.

> [!NOTE]
> The POS actively listens for changes to the Payment Mode. Switching back and forth between Cash and Card will dynamically update the Total Due on the screen in real-time.

---

## 3. Backend Processing & Overpayments (Change Due)

When the cashier hits **Save Sale**, the data is sent to the `SalesController`.

### A. Invoice Storage
The backend validates that the final totals and discounts provided by the POS match, and then stores the invoice in the `sales_transactions` table. Because the frontend already stripped the item discounts, the database records the items strictly with `0` discount, and logs the single total discount on the invoice header.

### B. Payment Recording & Change Handling
In retail, a customer often pays with a larger denomination (e.g., handing over a Rs. 1500 cash note for a Rs. 1440 bill). 
The cashier gives back Rs. 60 as change.

**How the system prevents false Customer Credits:**
1. The backend receives `cash_payment = 1500`.
2. It calculates the `balance` (Total Due - Paid). If the balance is negative, it means an overpayment occurred and change is owed.
3. Before writing the payment to the `customer_payments` ledger, the backend specifically intercepts the Cash payment.
4. It calculates the **Effective Cash Received** by subtracting the Change Due from the Cash Payment (`1500 - 60 = 1440`).
5. It records exactly `1440` into the customer\'s account ledger. 

> [!IMPORTANT]  
> This ensures that the customer\'s Outstanding Balance remains at **0.00**. Without this logic, the system would mistakenly think the customer deposited an extra Rs. 60 into their store account, leaving them with a `60.00 CR` outstanding balance.

---

## Summary of Files Involved
* **`SalesController.php` (`searchCustomers`)**: Sends the `is_privilege_user` status to the frontend.
* **`Create.tsx` (`calculateTotals`)**: Strips item discounts, applies global Privilege discounts, and switches percentages based on Cash vs Card.
* **`SalesController.php` (`store` & `update`)**: Subtracts the "Change Due" from the Cash amount before writing to the ledger, preventing accidental customer credit.
