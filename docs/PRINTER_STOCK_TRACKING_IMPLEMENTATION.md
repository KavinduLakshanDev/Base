# Printer Stock Tracking Implementation for Service Jobs

## Summary
This implementation ensures that when printer parts (items with serial numbers, brand, and model) are added to service jobs as parts, they are properly tracked across all stock reports including Printer Stock Transfer, Printer Stock Bin Card, and Printer Stock In Hand.

## Changes Made

### 1. Database Schema Updates
**Migration:** `2026_02_24_000000_add_printer_fields_to_service_job_items_table.php`
- Added `serial_number` column to `service_job_items` table
- Added `brand` column to `service_job_items` table  
- Added `model` column to `service_job_items` table

### 2. Model Updates

#### ServiceJobItem Model
**File:** `app/Models/ServiceJobItem.php`
- Added `serial_number`, `brand`, and `model` to fillable fields
- These fields are now stored when a printer part is added to a service job

### 3. Backend Updates

#### ServiceJobController
**File:** `app/Http/Controllers/ServiceJobController.php`

**addItem() method:**
- Added validation for `serial_number`, `brand`, and `model` fields
- Passes serial number to stock availability check
- Passes serial number to stock deduction method
- Logs serial number in stock deduction events

**removeItem() method:**
- Passes serial number when restoring stock
- Logs serial number in stock restoration events

**getAvailableStock() method:**
- Added `$serialNumber` parameter
- Filters stock by serial number when provided
- Ensures accurate stock availability for specific printers

**deductServiceJobStock() method:**
- Added `$serialNumber` parameter
- Filters stock records by serial number when looking for reference stock
- Preserves printer metadata (serial_number, brand, model) in stock transaction
- Creates SERVICE_JOB transaction with all printer details

**restoreServiceJobStock() method:**
- Added `$serialNumber` parameter
- Filters stock records by serial number when looking for reference stock
- Preserves printer metadata in stock restoration transaction
- Creates SERVICE_JOB_RETURN transaction with all printer details

#### PrinterStockBinCardController
**File:** `app/Http/Controllers/Reports/PrinterStockBinCardController.php`

**getPrinterTransactions() method:**
- Added SERVICE_JOB transaction type handling
- Added SERVICE_JOB_RETURN transaction type handling
- Joins with service_jobs table to show job numbers
- Displays "Service Job - Parts Used" for SERVICE_JOB transactions
- Displays "Service Job - Parts Returned" for SERVICE_JOB_RETURN transactions

**getOpeningBalance() method:**
- Already includes all transaction types including SERVICE_JOB
- No changes needed

### 4. Frontend Updates

#### ServiceJobs/Show.tsx
**File:** `resources/js/pages/ServiceJobs/Show.tsx`

**newItem state:**
- Added `serial_number` field (default: '')
- Added `brand` field (default: '')
- Added `model` field (default: '')

**selectItem() function:**
- Captures serial_number from selected printer item
- Captures brand from selected printer item
- Captures model from selected printer item
- Stores all metadata in newItem state

**handleAddItem() function:**
- Appends serial_number to form data when present
- Appends brand to form data when present
- Appends model to form data when present
- Sends all printer metadata to backend for stock deduction

**handleItemSearchChange() function:**
- Clears serial_number, brand, and model when search changes

**Form reset after adding item:**
- Resets serial_number to empty string
- Resets brand to empty string
- Resets model to empty string

### 5. Stock Bin Card Updates
**File:** `routes/web.php`

**Stock Bin Card route:**
- Added SERVICE_JOB transaction handling in opening balance calculation
- Added SERVICE_JOB and SERVICE_JOB_RETURN to transaction queries
- Added proper sorting priority for service job transactions
- Displays service job transactions in bin card report

## How It Works

### When Adding a Printer Part to Service Job:

1. **User selects printer from purchase_det:**
   - Frontend captures: serial_number, brand, model, batch_no, ItmKy

2. **Frontend sends to backend:**
   - All printer metadata included in form data

3. **Backend validates and stores:**
   - ServiceJobItem record created with serial_number, brand, model
   
4. **Stock deduction:**
   - Finds specific printer stock by serial_number + batch_no
   - Creates stock_in_hand record with TrnTyp='SERVICE_JOB'
   - Preserves all printer metadata (serial_number, brand, model)
   - Sets Qty to negative value (e.g., -1)
   - Links to service job via OrdKy field

5. **Reports automatically updated:**
   - Printer Stock In Hand: Balance reduced by SUM(Qty + FreeQty)
   - Printer Stock Bin Card: Shows "Service Job - Parts Used" transaction
   - Regular Stock Bin Card: Shows service job transaction

### When Removing a Printer Part from Service Job:

1. **User clicks remove button:**
   - Backend reads serial_number from ServiceJobItem

2. **Stock restoration:**
   - Finds original printer stock by serial_number + batch_no
   - Creates stock_in_hand record with TrnTyp='SERVICE_JOB_RETURN'
   - Preserves all printer metadata
   - Sets Qty to positive value (e.g., +1)
   - Links to service job via OrdKy field

3. **Reports automatically updated:**
   - Printer Stock In Hand: Balance increased
   - Printer Stock Bin Card: Shows "Service Job - Parts Returned" transaction

## Transaction Types

### SERVICE_JOB
- **Purpose:** Deduct stock when part added to service job
- **Qty:** Negative value (e.g., -1)
- **RefNo:** SJ-OUT-{job_id}
- **OrdKy:** Service job ID
- **Preserves:** serial_number, brand, model, batch_no, warranty

### SERVICE_JOB_RETURN
- **Purpose:** Restore stock when part removed from service job
- **Qty:** Positive value (e.g., +1)
- **RefNo:** SJ-IN-{job_id}
- **OrdKy:** Service job ID
- **Preserves:** serial_number, brand, model, batch_no, warranty

## Reports Integration

### Printer Stock In Hand Report
- Already working - calculates SUM(Qty + FreeQty) which includes SERVICE_JOB transactions
- Filters by serial_number automatically
- Shows current balance for each printer

### Printer Stock Bin Card
- Now includes SERVICE_JOB and SERVICE_JOB_RETURN transactions
- Shows job number in description
- Displays "Service Job - Parts Used" for deductions
- Displays "Service Job - Parts Returned" for restorations
- Calculates opening balance including service job transactions

### Regular Stock Bin Card
- Already updated to include SERVICE_JOB transactions
- Shows service job movements for all items (not just printers)

### Printer Stock Transfer Report
- Uses stock_in_hand table filtered by serial_number
- Automatically includes SERVICE_JOB transactions
- No code changes needed

## Testing Checklist

✅ Database migration successful
✅ Model fillable fields updated
✅ Backend validation includes printer fields
✅ Stock deduction preserves serial_number
✅ Stock restoration preserves serial_number
✅ Printer bin card shows SERVICE_JOB transactions
✅ No syntax errors in any files

### Manual Testing Required:

1. **Add Printer to Service Job:**
   - Navigate to a service job
   - Click "Add Item"
   - Select item type: "Part"
   - Search for a printer (item with serial number)
   - Select the printer
   - Verify batch dropdown shows available batches
   - Add the printer to the service job
   - Check that serial_number, brand, model are stored in service_job_items
   - Verify stock_in_hand has SERVICE_JOB record with printer metadata

2. **Check Printer Stock Bin Card:**
   - Navigate to Reports → Printer Stock Bin Card
   - Select the printer by serial number
   - Verify "Service Job - Parts Used" transaction appears
   - Verify job number is shown in description
   - Verify balance decreases correctly

3. **Check Printer Stock In Hand:**
   - Navigate to Reports → Printer Stock In Hand
   - Find the printer by serial number
   - Verify balance is reduced

4. **Remove Printer from Service Job:**
   - Go back to the service job
   - Click remove on the printer item
   - Verify stock_in_hand has SERVICE_JOB_RETURN record
   - Check Printer Stock Bin Card shows "Parts Returned"
   - Verify balance is restored

## Files Modified

1. `database/migrations/2026_02_24_000000_add_printer_fields_to_service_job_items_table.php` (NEW)
2. `app/Models/ServiceJobItem.php`
3. `app/Http/Controllers/ServiceJobController.php`
4. `app/Http/Controllers/Reports/PrinterStockBinCardController.php`
5. `resources/js/pages/ServiceJobs/Show.tsx`
6. `routes/web.php`

## Verification Scripts

1. `verify_service_job_stock.php` - Verifies general service job stock tracking
2. `verify_printer_stock_tracking.php` - Verifies printer-specific stock tracking

## Key Features

✅ **Serial Number Tracking:** Each printer transaction preserves unique serial number
✅ **Brand & Model Tracking:** Printer brand and model stored and tracked
✅ **Accurate Stock:** Specific printer stock deducted (not just any printer of same model)
✅ **Audit Trail:** Complete history of printer movement through service jobs
✅ **Report Integration:** All printer stock reports show service job transactions
✅ **Automatic Updates:** No manual stock adjustments needed
✅ **Transaction Reversal:** Removing part automatically restores stock

## Notes

- Service jobs ALWAYS use section code 'VIS-SEC-001' (service section)
- Stock deduction happens immediately when part is added
- Stock restoration happens immediately when part is removed
- All transactions are wrapped in database transactions for data integrity
- Errors during stock operations trigger rollback
- Logging included for debugging and audit purposes
