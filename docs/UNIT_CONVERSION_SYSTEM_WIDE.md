# Unit Conversion System-Wide Implementation

## Overview

The unit conversion feature now affects the entire system, ensuring that reports and stock tracking correctly handle items with different units (e.g., bundles converted to individual sheets).

## Example Scenario

**A4 Paper Bundle to Sheets:**
1. Purchase 10 bundles of A4 paper
2. Transfer 10 bundles to another section via Stock Transfer
3. Use Stock Conversion to break down 1 bundle → 100 sheets
4. Sell 10 sheets
5. **Result:** Stock shows **9 bundles + 90 sheets**

## Implementation Details

### 1. Database Changes

**Migration:** `2026_03_04_100000_add_unit_tracking_to_stock_in_hand_table.php`

Added `UnitKy` column to `stock_in_hand` table:
- Tracks which unit each stock record represents
- Nullable (defaults to item's primary unit for existing records)
- Indexed for better query performance when grouping by unit
- Backfilled existing records with item's primary unit

```sql
ALTER TABLE stock_in_hand ADD COLUMN UnitKy INT UNSIGNED NULL AFTER ItemKy;
ALTER TABLE stock_in_hand ADD INDEX idx_item_unit (ItemKy, UnitKy);
```

### 2. Stock Conversion Updates

**File:** `app/Models/StockConversion.php`

Updated `executeConversion()` method to set `UnitKy` on stock_in_hand records:
- **OUT record:** Sets `UnitKy = from_unit_id` (unit being deducted)
- **IN record:** Sets `UnitKy = to_unit_id` (unit being credited)

This ensures each conversion creates records with the correct unit identifier.

### 3. Stock In Hand Report

**Backend:** `app/Http/Controllers/Reports/StockInHandReportController.php`

Changes:
- Group by `ItemKy`, `UnitKy`, AND `batch_no` (previously only ItemKy + batch_no)
- Join with `code_masters` to get unit names
- Include `unit_name` in results

**Frontend:** `resources/js/pages/Reports/StockInHand.tsx`

Changes:
- Added **Unit** column between Item Name and Batch No
- Displays unit name with green badge
- Shows items with different units as separate rows

Example output:
```
Item Code | Item Name      | Unit    | Batch No | Stock
A4-001    | A4 Paper       | Bundle  | B123     | 9.00
A4-001    | A4 Paper       | Sheet   | B123     | 90.00
```

### 4. Stock Bin Card Report

**Backend:** `routes/web.php` (inline route definition)

Changes:
- Added stock conversion transaction fetching
- Conversions create TWO entries in bin card:
  - **OUT:** Shows deduction of input units with unit name
  - **IN:** Shows addition of output units with unit name
- Updated opening balance calculation to include conversions before date
- Added conversion types to transaction priority

Example bin card entries:
```
Date       | Description                                    | Received | Issued | Balance
2026-03-04 | Stock Conversion OUT - Convert from Bundle    | 0.00     | 1.00   | 9.00
2026-03-04 | Stock Conversion IN - Convert to Sheet        | 100.00   | 0.00   | 109.00
2026-03-05 | Sale - Invoice #INV-001                       | 0.00     | 10.00  | 99.00
```

### 5. How It Works End-to-End

#### Purchase Flow:
```
Purchase 10 bundles → stock_in_hand record created with:
- ItemKy = A4 item ID
- UnitKy = Bundle unit ID  
- Qty = 10
```

#### Transfer Flow:
```
Transfer 10 bundles to another section → Two stock_in_hand records:
1. Source section: Qty = -10, UnitKy = Bundle unit ID
2. Dest section:   Qty = 10,  UnitKy = Bundle unit ID
```

#### Conversion Flow:
```
Convert 1 bundle to 100 sheets → Two stock_in_hand records:
1. OUT: Qty = -1,   UnitKy = Bundle unit ID
2. IN:  Qty = 100,  UnitKy = Sheet unit ID
```

#### Sales Flow:
```
Sell items with unit detection:
- If sale unit matches item's receiving_unit_id → UnitKy = receiving_unit_id
- Example: Selling 10 sheets → stock_in_hand record with:
  - ItemKy = A4 item ID
  - UnitKy = Sheet unit ID (receiving unit)
  - Qty = -10
  - TrnTyp = 'SAL-NOS'

- If sale unit matches item's transfer_unit_id → UnitKy = transfer_unit_id  
- Example: Selling 2 bundles → stock_in_hand record with:
  - ItemKy = A4 item ID
  - UnitKy = Bundle unit ID (transfer unit)
  - Qty = -2
  - TrnTyp = 'SAL' or 'SAL-BND'
```

#### Reports Show:
- Stock In Hand: **9 bundles + 90 sheets** (two separate rows)
- Stock Bin Card: All transactions with proper units shown

### 6. Key Business Rules

| Rule | Implementation |
|------|----------------|
| Unit conversion only applies if product has `transfer_unit_id` and `receiving_unit_id` configured | Checked in Product model |
| Each stock_in_hand record has its own unit | `UnitKy` column |
| Reports group by item + unit | Backend queries updated |
| Conversions appear in bin card with unit names | Backend route updated |
| Opening balances include conversions | Calculation updated |

### 7. Affected Components

✅ **Database:**
- `stock_in_hand` table structure
- Migration to add UnitKy column

✅ **Models:**
- `StockConversion::executeConversion()`

✅ **Controllers:**
- `StockInHandReportController::index()`

✅ **Views:**
- `StockInHand.tsx` - Added Unit column
- `StockBinCard.tsx` - Already displays descriptions (no UI change needed)

✅ **Routes:**
- `routes/web.php` - Stock bin card inline route updated

### 8. Testing the Flow

1. **Setup:** Configure a product with unit conversion (e.g., Bundle → Sheet, factor 100)

2. **Purchase:** Buy 10 bundles via GRN

3. **Transfer:** Transfer to another section via Stock Transfer

4. **Convert:** Use Stock Conversion to break down 1 bundle into 100 sheets

5. **Sell:** Create a sale for 10 sheets

6. **Verify Reports:**
   - Stock In Hand: Should show 2 rows (9 bundles + 90 sheets)
   - Stock Bin Card: Should show all transactions with correct units

### 9. Migration Instructions

```bash
# Run the migration
php artisan migrate

# Rebuild frontend assets
npm run build

# Clear caches
php artisan route:clear
php artisan view:clear
php artisan config:clear
```

### 10. Notes

- **Backward Compatible:** Existing records without UnitKy use item's primary unit
- **Performance:** Added index on (ItemKy, UnitKy) for faster grouping
- **Unit-Aware:** All reports now properly distinguish items by unit
- **Conversion Neutral:** Conversions don't change total item quantity, only unit distribution

## Summary

The system now fully supports unit conversions throughout all stock movements and reports. Items can exist in multiple units simultaneously (e.g., bundles and sheets), and reports accurately reflect the quantity in each unit. This is critical for businesses that purchase in bulk units and sell in smaller units.
