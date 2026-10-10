# Sales Discount System Analysis

Based on an analysis of the Sales Module (specifically `Sales/Create.tsx`), here is the complete breakdown of how discounts, pricing tiers, and special customer rates are calculated and applied. No code changes have been made.

## 1. Item-Level Discounts (Tiered & Fixed)
When an item is added to the cart, the system evaluates item-level discounts in the following order of precedence:

### A. Quantity-Based Tiers (Retail Pricing)
* Each item can have up to 4 discount tiers (`tier1` to `tier4`).
* When the quantity changes (`updateQuantity` or `addSpecificItem`), the system checks the tiers from highest (`tier4`) to lowest (`tier1`).
* If the item's quantity `>` or `=` the tier's minimum quantity, the system applies that tier's fixed discount amount **per item**.
  * *Formula:* `discountAmount = tier.discount * newQuantity`

### B. Fixed Customer Discount (`cus_discount_rate`)
* If **no quantity tier** is met, the system falls back to checking `cus_discount_rate`.
* If available, it applies this as a fixed rate per item.
  * *Formula:* `discountAmount = cus_discount_rate * newQuantity`

### C. Manual Discount Override
* Cashiers (with admin authorization) can manually edit the discount on a specific line item (`updateDiscount`).
* This overrides any auto-calculated tier or fixed discounts.

### D. Wholesale Pricing Override
* If the total quantity of an item meets its `wholesale_min_qty`, OR if the entire bill is set to the `wholesale` price type:
  * The item's price switches from `retail_price` to `wholesale_price`.
  * **Rule:** All item-level discounts are immediately stripped (`discountAmount = 0`). Wholesale items do not receive tier discounts.

---

## 2. Payment Mode Pricing (Card & Credit)
Changing the payment mode drastically alters how item prices and discounts behave:

### Switching to "Card" or "Credit":
1. **Price Change:** All items in the cart abandon their retail/wholesale price and use their `card_price` (falling back to `retail_price` if no card price exists).
2. **Discounts Stripped:** All item-level discounts (`discount_amount`) are set to `0`. The original discounts are temporarily saved in memory.
3. **Global Discounts Removed:** The overall manual discount percentage on the bill is set to `0`.

### Switching back to "Cash" / "Cheque" / "Bank Transfer":
* The system restores the original unit prices and restores the original item-level discounts that were stripped during the card/credit mode.

---

## 3. Global & Privilege Discounts (Bill-Level)
Global discounts are applied to the **Net Total** of the bill (Gross Total minus all item-level discounts) inside the `calculateTotals()` function.

* *Formula:* `Bill Discount = (Net Subtotal * (Discount Percentage / 100)) + Fixed Manual Discount`

### Privilege Customers
If a customer is marked as a `is_privilege_user`, a rigid set of rules takes over the entire bill:
1. **Item Discounts Destroyed:** The system forcibly strips all item-level discounts from every item in the cart. Privilege users cannot stack item discounts with global discounts.
2. **Price Type:** The bill is automatically forced into `wholesale` pricing mode.
3. **Strict Global Percentages:** The manual discount percentage is locked and automated based on the payment mode:
   * **Cash/Cheque/Bank:** Uses the company's `privilege_users_discount` percentage.
   * **Card:** Uses the company's `privilege_card_discount` percentage.
   * **Credit:** Receives `0%` global discount.

---

## Summary of Execution Order (`calculateTotals`)
1. Determine if Privilege Customer rules apply (strip item discounts).
2. Calculate the Item Net Price (`Gross - Item Discount`).
3. Calculate the VAT Base (for exclusive/inclusive calculations).
4. Apply Global Discounts (`Percentage` and `Fixed`) to the sum of Item Net Prices.
5. Add VAT (if applicable).
6. Result is the Final Total.
