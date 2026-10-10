# Purchase Edit Page Fixes

## Overview

This document covers all fixes and improvements made to the Purchase (GRN) edit page and related backend/test files.

---

## 1. Test Infrastructure Fix

**File:** `phpunit.xml`  
**File:** `tests/Feature/PurchaseEditTest.php`

### Problem
`PurchaseEditTest` was failing because the SQLite PDO driver was not installed on the server.

### Fix
- Switched `phpunit.xml` from `sqlite` to `mysql` database connection.
- Replaced `RefreshDatabase` trait with `DatabaseTransactions` in the test class (avoids full schema recreation, works with MySQL).
- Fixed User factory: replaced non-existent `is_super_admin => true` column with `user_type => 'super_admin'`.

---

## 2. Product Code Not Showing in Edit Page

**File:** `app/Http/Controllers/POS/PurchaseController.php`

### Problem
The show page displayed "Code: 888888" correctly, but the edit page showed "-" for the product code.

### Root Cause
The `edit()` controller method used PHP's `??` (null coalescing) operator to get `ItemCode` from the `itemmaster` table. However, `ItemCode` is defined as `NOT NULL` in the database and can be an **empty string** `''`. The `??` operator treats `''` as a valid (truthy) value and does **not** fall through to the `barcode` fallback.

### Fix
Both `show()` and `edit()` now use `!empty($itemCode)` instead of `??`:

```php
// Before (broken — '' doesn't fall through)
$code = $detail->product->ItemCode ?? $detail->barcode ?? '';

// After (correct — '' correctly falls through to barcode)
$itemCode = $detail->product ? ($detail->product->ItemCode ?? '') : '';
$code = !empty($itemCode) ? $itemCode : ($detail->barcode ?? '');
```

**Applied to:**
- `show()` method ~line 1238
- `edit()` method ~line 1388

---

## 3. Expanded PHPUnit Tests

**File:** `tests/Feature/PurchaseEditTest.php`

Expanded from 1 test to 4 tests using a shared `makePurchase()` helper method.

| # | Test Name | What It Verifies |
|---|---|---|
| 1 | `test_main_stock_purchase_shows_product_code_in_edit_props` | Main-stock item with `ItemCode` returns correct `product_code` |
| 2 | `test_printing_section_purchase_shows_product_code_in_edit_props` | Printer item with `ItemCode = '888888'` returns correct `product_code` |
| 3 | `test_product_code_falls_back_to_barcode_when_itemcode_empty` | Empty `ItemCode` (`''`) falls back to `barcode = 'BAR9999'` |
| 4 | `test_show_and_edit_return_same_product_code` | `show()` and `edit()` return identical `product_code` for same purchase |

**Total: 64 assertions — all passing.**

---

## 4. Printer GRN — Hide Product Code Column

**File:** `resources/js/pages/pos/purchases/edit.tsx`

### Problem
The Product Code column was showing in the edit table for Printer GRNs, but printer items don't have a product code (they use serial numbers instead).

### Fix
Added `isPrinterGrn` detection flag and conditionally hid the Product Code column header and cells.

```tsx
const hasFreeItems = purchase.items.some(item => item.free_qty > 0);
const isPrinterGrn = purchase.items.length > 0 &&
    purchase.items.every(item => item.stock_location_type === 'printing_section') &&
    !hasFreeItems;
```

```tsx
{/* Column header */}
{!isPrinterGrn && (
    <th>Product Code</th>
)}

{/* Table cell */}
{!isPrinterGrn && (
    <td>...product_code input/display...</td>
)}
```

---

## 5. Printer GRN QTY — Make Read-Only

**File:** `resources/js/pages/pos/purchases/edit.tsx`

### Problem
The QTY cell editability was based on `item.serial_number`. So for printer items that had no serial number yet (new GRNs), the QTY showed as an editable input — incorrectly allowing values like `150`. Printer GRNs each have qty `1` per line (one unit per serial), so qty must always be read-only.

### Fix
Changed the QTY column condition from `item.serial_number` check to `isPrinterGrn`:

```tsx
// Before (wrong — depended on serial_number being populated)
{item.serial_number && item.serial_number.trim() !== '' ? (
    <span>{data.items[index]?.qty}</span>  // read-only
) : (
    <input ... />  // editable (incorrectly showed for new printer items)
)}

// After (correct — always read-only for printer GRNs)
{isPrinterGrn ? (
    <span>{data.items[index]?.qty}</span>  // always read-only for printer GRN
) : (
    <input ... />  // editable for main-stock GRN only
)}
```

---

## 6. Dedicated Serial Number Column for Printer GRNs

**File:** `resources/js/pages/pos/purchases/edit.tsx`

### Problem
The serial number was displayed as a small sub-field *below* the product name inside the same table cell. This was visually inconsistent and made the column layout differ between view and edit modes.

### Fix
Moved serial number to its own dedicated column for printer GRNs, mirroring how product code is a dedicated column for main stock GRNs.

**Final column layout:**

| GRN Type | Columns |
|---|---|
| **Main Stock GRN** | `#` → Product Code → Product Name → Qty → Cost Price → Discount Rate → Cus Discount Rate → Amount → Action |
| **Printer GRN** | `#` → Product Name → Serial Number → Qty → Cost Price → Discount Rate → Cus Discount Rate → Amount → Action |

Serial Number column behavior:
- **View mode**: displays serial number in monospace font, or `-` if not set
- **Edit mode**: shows an editable input field with "Serial No" placeholder

---

## 7. Summary of Field Rules per GRN Type

| Field | Main Stock GRN | Printer GRN |
|---|---|---|
| Product Code | ✅ Dedicated column (editable) | ❌ Hidden |
| Product Name | ✅ Editable | ✅ Editable |
| Serial Number | ❌ Not shown | ✅ Dedicated column (editable) |
| QTY | ✅ Editable | ❌ Read-only (always 1 per line) |
| Cost Price | ✅ Editable | ✅ Editable |
| Discount Rate | ✅ Editable | ✅ Editable |
| Cus Discount Rate | ✅ Editable | ✅ Editable |

---

## Files Changed

| File | Changes |
|---|---|
| `phpunit.xml` | SQLite → MySQL |
| `app/Http/Controllers/POS/PurchaseController.php` | `empty()` fix in `show()` and `edit()` |
| `tests/Feature/PurchaseEditTest.php` | Complete rewrite: 4 tests, `DatabaseTransactions`, `makePurchase()` helper |
| `resources/js/pages/pos/purchases/edit.tsx` | `isPrinterGrn` flag, hidden Product Code for printer GRNs, read-only QTY for printer GRNs, dedicated Serial Number column for printer GRNs |
