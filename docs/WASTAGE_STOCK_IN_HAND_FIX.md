# Stock In Hand Wastage Fix - Implementation Summary

**Date:** February 18, 2026  
**Issue:** Wastage transactions not properly reflected in Stock In Hand report

## Problem Description

When wastage was recorded from the delivery section (e.g., MAL-SEC-001), the Stock In Hand report was showing incorrect stock quantities. For example:

- **Expected:** GRN-VIS-VIS-0871 • 18/02/2026 • Qty: 6.00 (after 4.00 wastage from 10.00)
- **Actual (Before Fix):** GRN-VIS-VIS-0871 • 18/02/2026 • Qty: 10.00 (wastage not deducted)

## Root Cause

The wastage records were created with the wrong `company_code` in the `stock_in_hand` table:

1. When wastage was recorded in section **MAL-SEC-001** (which belongs to company **MAL001**)
2. The system was using the `company_code` from the reference stock record (which was **VIS001**)
3. This resulted in records with:
   - `section_code` = **MAL-SEC-001** ✓ (correct)
   - `company_code` = **VIS001** ✗ (incorrect, should be **MAL001**)

4. The Stock In Hand report filters by BOTH `company_code` AND `section_code`, so it excluded these wastage records
5. Result: Stock showed 10.00 instead of 6.00 (wastage not reflected)

## Database Evidence (Before Fix)

```sql
-- Grouped by company_code and section_code
Company: MAL001 | Section: MAL-SEC-001 | Total: 10.00  -- WITHOUT wastage
Company: VIS001 | Section: MAL-SEC-001 | Total: -4.00  -- The wastage records
```

## Solution Implemented

### 1. Fixed WastageController.php

**File:** `app/Http/Controllers/WastageController.php`

**Changes:**
- Added `use App\Models\Company;` import
- Modified `deductStock()` function to get `company_code` from the section, not from reference stock
- Modified `restoreStock()` function to get `company_code` from the section, not from reference stock
- Both functions now correctly lookup the company ID from the company_code

**Code Changes:**

```php
// OLD (INCORRECT):
$companyCode = $referenceStock->company_code ?? session('company_code') ?? ...;
$companyId = $referenceStock->Cky ?? session('company_id') ?? ...;

// NEW (CORRECT):
$section = Section::where('section_code', $sectionCode)->first();
$companyCode = $section->company_code ?? session('company_code') ?? ...;
$company = Company::where('company_code', $companyCode)->first();
$companyId = $company->id ?? session('company_id') ?? ...;
```

### 2. Fixed Existing Data

**Script:** `fix_wastage_company_code.php`

- Identified 2 existing wastage records with wrong company_code
- Updated them from VIS001 to MAL001
- Both records were for:
  - Item: p001 (Epson L8050 ink)
  - Batch: GRN-VIS-VIS-0871
  - Section: MAL-SEC-001
  - Qty: -2.00 each (wastage deduction)

**SQL Executed:**
```sql
UPDATE stock_in_hand 
SET company_code = 'MAL001', Cky = <MAL001_company_id>
WHERE TableKy IN (20, 28);
```

## Verification Results

### After Fix:

```
Company: MAL001 | Section: MAL-SEC-001 | Total: 6.00
  - Transactions: 3
  - Types: IN,WASTAGE
  - Calculation: 10 (IN) - 2 (WASTAGE) - 2 (WASTAGE) = 6.00 ✓

Company: MAL001 | Section: MAL-SEC-002 | Total: 12.00
  - Transactions: 1
  - Types: IN
  - Calculation: 12 (IN) = 12.00 ✓

Company: VIS001 | Section: VIS-SEC-003 | Total: 0.00
  - Transactions: 3
  - Types: GRN,OUT,OUT
  - Calculation: 22 (GRN) - 10 (OUT) - 12 (OUT) = 0.00 ✓
```

### Stock In Hand Report Query:
```
Section: MAL-SEC-001 (Company: MAL001)
Result: 6.00
Expected: 6.00
✓ CORRECT!
```

## Impact

### What's Fixed:
✅ Wastage transactions now correctly use the section's company_code  
✅ Stock In Hand report accurately reflects wastage deductions  
✅ Stock Bin Card already working correctly (was not affected)  
✅ Cross-company transfers continue to work correctly  
✅ Future wastage records will be created with correct company_code  
✅ All existing incorrect records have been fixed  

### What's NOT Affected:
- Stock transfers between sections
- GRN (Goods Received Notes) 
- Sales transactions
- Supplier returns
- Wastage restorations (WST_RESTO)

## Testing Performed

1. ✓ Verified existing wastage records were corrected
2. ✓ Confirmed Stock In Hand report shows correct quantities
3. ✓ Verified query logic matches expected results
4. ✓ Checked no phantom records exist with mismatched company_code

## Related Files

- `app/Http/Controllers/WastageController.php` - Main fix
- `fix_wastage_company_code.php` - Data correction script
- `verify_stock_in_hand_fix.php` - Verification script
- `check_stock_wastage.php` - Diagnostic script
- `check_section_stock.php` - Section stock analysis script

## Technical Notes

The `stock_in_hand` table uses composite filtering:
- `company_code` + `section_code` for stock ownership
- `TrnTyp` indicates transaction type (GRN, WASTAGE, IN, OUT, etc.)
- Wastage uses negative `Qty` to deduct stock
- Restorations use positive `Qty` with TrnTyp='WST_RESTO'

The Section model has `company_code` but NOT `company_id`, so we must lookup the Company by `company_code` to get the `id` for the `Cky` field in stock_in_hand.

## Deployment Notes

1. Deploy updated `WastageController.php`
2. No migration required (table structure unchanged)
3. Consider running `fix_wastage_company_code.php` on production if similar issues exist
4. Monitor wastage transactions to ensure correct company_code assignment

---

**Status:** ✓ COMPLETED  
**Verified:** February 18, 2026  
**Issue Resolution:** Wastage now correctly updates Stock In Hand report across all sections
