# Dynamic Price Update Logic

## Summary
The invoice system has been updated to support dynamic price switching based on Payment Mode, including support for VAT-inclusive (fixed price) items.

## Key Logic Changes

### 1. Centralized Price Logic (`getCurrentPrice`)
Price determination is now centralized in `Create.tsx`. The priority of rules is:

1.  **Card Payment Mode**: If Payment Mode is 'Card', the price defaults to `card_price`. If `card_price` is missing, it falls back to `retail_price`. This applies to ALL items, including VAT-inclusive ones.
2.  **VAT Inclusive Items**: If an item is VAT-inclusive, it typically has a fixed MRP. In non-Card modes, these items are forced to use `retail_price` and ignore wholesale/extra keys.
3.  **Standard Price Types**: For standard items in non-Card modes, the price follows the selected Price Type (Retail / Wholesale / Extra).

```typescript
// Pseudocode Logic
if (payment_mode == 'card') return card_price || retail_price;
if (item.vat_inclusive) return retail_price; // Fixed MRP
if (price_type == 'wholesale') return wholesale_price;
// ... etc
```

### 2. Automatic Updates
The `useEffect` hook triggers whenever `payment_mode` or `price_type` changes. It now iterates through ALL items (including VAT-inclusive ones) and recalculates their `unit_price` using the logic above.

### 3. Display Columns
-   **"Our Price" Column**: Displays the static `retail_price` as a reference.
-   **"Sales Price" Column**: Displays the dynamic `unit_price`, reflecting the actual transaction price (e.g., Card Price magnitude).

## Verification
-   **Scenario A**: Add VAT-inclusive item via Cash. Price is Retail. Switch to Card. Price updates to Card Price. Switch to Cash. Price reverts to Retail.
-   **Scenario B**: Add Standard item via Wholesale. Switch to Card. Price updates to Card Price. Switch to Cash. Price reverts to Wholesale (assuming Price Type is still Wholesale) OR Retail (if logic resets? Note: logic uses `data.price_type` which persists).
    -   *Correction*: If `vat_inclusive` is false, it uses `data.price_type`. If `data.price_type` is 'wholesale', it returns `wholesale_price`. So correct reversion happens.

This ensures consistency across different item types and payment scenarios.
