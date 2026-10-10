# Sales Item Return Implementation Guide

## Overview

The Sales Item Return system manages the complete lifecycle of customer returns - from initiation through stock adjustments, financial reconciliation, and exchange processing. This document explains how the `CustomerReturnController` handles all aspects of returned items.

---

## Table of Contents

1. [High-Level Flow](#high-level-flow)
2. [Return Creation Process](#return-creation-process)
3. [Stock Management](#stock-management)
4. [Financial Adjustments](#financial-adjustments)
5. [Exchange Processing](#exchange-processing)
6. [Key Business Rules](#key-business-rules)
7. [Database Models](#database-models)
8. [API Endpoints](#api-endpoints)

---

## High-Level Flow

```
Customer Return Request
        ↓
Validate Items (qty, condition, etc.)
        ↓
Check Sale Exists ← (Link to original invoice)
        ↓
Verify Returnable Qty ← (Not over-returning)
        ↓
Create CustomerReturn record
        ↓
For Each Returned Item:
  ├─ If condition='good' & add_to_stock=true:
  │   └─ Add to StockInHand (ORIGINAL section)
  │       + Create StockTransfer if section changed
  │
  └─ If condition='damaged'/'defective':
      └─ Write off (no stock entry)
        ↓
For Each Exchange Item:
  └─ Deduct from StockInHand (current section)
        ↓
Update SalesTransaction Financials:
  ├─ Reduce total_amount
  ├─ Recalculate balance_amount
  └─ Update status
        ↓
Create Cash Refund Payment Record (if cash/partial)
        ↓
Return: Complete ✅
```

---

## Return Creation Process

### 1. Authorization Check

```php
if (!request()->user()->hasPermission('customer_returns.create')) {
    return redirect()->back()->with('error', 'Unauthorized...');
}
```

Only users with `customer_returns.create` permission can create returns.

### 2. Input Validation

The system validates the following:

#### Return Details
- `return_date` (required, must be date)
- `customer_name` (required, string max 255)
- `customer_code` (nullable)
- `customer_id` (nullable)
- `original_invoice_no` (nullable, used to link to sale)
- `return_type` (required: item|printer|mixed)
- `refund_method` (required: cash|exchange|credit|partial)
- `reason` (nullable, description of return)
- `notes` (nullable, additional notes)

#### Returned Items (array, min 1)
```php
'items' => [
    'item_code' => 'required|string',
    'item_ky' => 'nullable|integer',
    'item_name' => 'required|string',
    'quantity' => 'required|numeric|min:0.01',
    'unit_price' => 'required|numeric|min:0',
    'discount_amount' => 'nullable|numeric|min:0',
    'tax_amount' => 'nullable|numeric|min:0',
    'batch_no' => 'nullable|string',
    'serial_number' => 'nullable|string',
    'brand' => 'nullable|string',
    'model' => 'nullable|string',
    'warranty' => 'nullable|string',
    'item_type' => 'required|in:item,printer',
    'condition' => 'required|in:good,damaged,defective',
    'damage_notes' => 'nullable|string',
    'add_to_stock' => 'boolean',
    'original_sale_item_id' => 'nullable|integer',
]
```

#### Exchange Items (optional array)
```php
'exchange_items' => [
    'item_code' => 'required_with|string',
    'item_ky' => 'nullable|integer',
    'item_name' => 'required_with|string',
    'quantity' => 'required_with|numeric|min:0.01',
    'unit_price' => 'required_with|numeric|min:0',
    'discount_amount' => 'nullable|numeric|min:0',
    'tax_amount' => 'nullable|numeric|min:0',
    'batch_no' => 'nullable|string',
    'serial_number' => 'nullable|string',
    'item_type' => 'nullable|in:item,printer',
]
```

### 3. Sales Invoice Lookup

```php
$origInvoice = $validated['original_invoice_no'] ?? null;

if (!empty($origInvoice)) {
    // Strip colon suffix (e.g., "INV-001:1" → "INV-001")
    $searchInvoice = preg_replace('/:.*/', '', trim($origInvoice));
    
    $salesTransaction = SalesTransaction::where('invoice_no', $searchInvoice)->first();
    if ($salesTransaction) {
        $salesTransactionId = $salesTransaction->id;
    }
}
```

**Key Points:**
- Invoice number is system-unique (no filtering by company/section needed)
- Allows user to type with colon suffix (automatically stripped)
- Links returned items to original sale transaction

### 4. Returnable Quantity Guard ⚠️

**Before creating any return records**, the system validates that returned quantities don't exceed what's still returnable:

```php
if (!empty($origInvoice) && $salesTransaction) {
    foreach ($validated['items'] as $itemData) {
        $saleItem = SalesTransactionItem::where('sales_transaction_id', $salesTransaction->id)
            ->where('item_code', $itemData['item_code'])
            ->first();

        if (!$saleItem) continue;

        // Sum quantities already returned (non-cancelled returns only)
        $alreadyReturned = CustomerReturnItem::where('item_code', $itemData['item_code'])
            ->where(function ($q) {
                $q->whereNull('item_direction')
                  ->orWhere('item_direction', 'in');
            })
            ->whereHas('customerReturn', fn ($q) => $q
                ->where('original_invoice_no', $origInvoice)
                ->where('status', '!=', 'cancelled')
            )
            ->sum('quantity');

        $returnableQty = $saleItem->quantity - $alreadyReturned;

        if ($itemData['quantity'] > $returnableQty) {
            DB::rollBack();
            return redirect()->back()->withInput()
                ->with('error', "Cannot return {$itemData['quantity']}. "
                    . "Only {$returnableQty} unit(s) can still be returned.");
        }
    }
}
```

**Logic:**
```
Returnable Qty = Sale Item Qty - Already Returned Qty

Example:
- Sold 10 units
- Already returned 3 units
- Can return up to 7 more units
```

### 5. Create Customer Return Record

```php
$customerReturn = CustomerReturn::create([
    'return_no' => $returnNo,
    'return_date' => $validated['return_date'],
    'customer_name' => $validated['customer_name'],
    'customer_code' => $validated['customer_code'] ?? null,
    'customer_id' => $validated['customer_id'] ?? null,
    'sales_transaction_id' => $salesTransactionId,
    'original_invoice_no' => $validated['original_invoice_no'] ?? null,
    'section_code' => $user->section_code,
    'company_code' => $user->company_code,
    'return_type' => $validated['return_type'],
    'total_return_amount' => $totalReturnAmount,
    'return_value' => $totalReturnAmount,
    'refund_amount' => $validated['refund_amount'] ?? $totalReturnAmount,
    'exchange_amount' => $validated['exchange_amount'] ?? 0,
    'refund_method' => $validated['refund_method'],
    'refund_details' => $validated['refund_details'] ?? null,
    'status' => 'pending',
    'notes' => $validated['notes'] ?? null,
    'reason' => $validated['reason'] ?? null,
    'processed_by' => $user->id,
    'processed_at' => now(),
]);
```

---

## Stock Management

### Overview

Returned items are added back to `stock_in_hand` table with special tracking. The key challenge: **where should the stock go?**

**Answer:** Stock must return to the **section that originally sold it**, not the section processing the return.

### Stock Location Determination

Priority order for determining target section:

1. **If linked to sale transaction** → Use `sale->section_code`
2. **If item has original_sale_item_id** → Try to use that sale item's section
3. **If walk-in return** (no invoice) → Use main stock section (`is_main_stock = true`)
4. **Fallback** → Use current user's section

```php
$targetSectionCode = $user->section_code; // Default

if ($salesTransaction && $salesTransaction->section_code) {
    $targetSectionCode = $salesTransaction->section_code;
} elseif (!empty($itemData['original_sale_item_id'])) {
    $originalSaleItem = SalesTransactionItem::find($itemData['original_sale_item_id']);
    if ($originalSaleItem && $originalSaleItem->section_code) {
        $targetSectionCode = $originalSaleItem->section_code;
    }
} else {
    // Walk-in return: use main stock section
    $mainStockSection = Section::where('company_code', $user->company_code)
        ->where('is_main_stock', true)
        ->first();
    
    if ($mainStockSection) {
        $targetSectionCode = $mainStockSection->section_code;
    }
}
```

### Regular Items (Non-Printer)

Only added to stock if `condition = 'good'` AND `add_to_stock = true`.

#### Stock Entry Created

```php
StockInHand::create([
    'uuid' => (string) \Illuminate\Support\Str::uuid(),
    'RefNo' => $returnNo,
    'company_code' => $companyCode,
    'owner_company_code' => $companyCode,
    'section_code' => $targetSectionCode,  // ← IMPORTANT: original section
    'OrdDate' => $returnDate,
    'ItemKy' => $returnItem->item_ky,
    'Qty' => $returnItem->quantity,  // ← Positive (adding)
    'FreeQty' => 0,
    'TrnTyp' => 'CUSTOMER_RETURN',
    'OrdKy' => $returnItem->customer_return_id,
    'batch_no' => $returnItem->batch_no ?: null,
    'Cky' => 0,
]);
```

**Key Fields:**
- `TrnTyp = 'CUSTOMER_RETURN'` → Identifies transaction type
- `Qty > 0` → Positive quantity (stock coming in)
- `batch_no` → Restored to original batch (nullable = same group as original)
- `section_code` → The section that sold it (not current section)

#### Stock Transfer Created (if section changed)

If the returned item is being restored to a different section than current:

```php
if ($returnItem->original_sale_item_id) {
    $originalSaleItem = SalesTransactionItem::find($returnItem->original_sale_item_id);
    if ($originalSaleItem && $originalSaleItem->section_code !== $sectionCode) {
        StockTransfer::create([
            'transfer_number' => $returnNo,
            'from_section_code' => $originalSaleItem->section_code,
            'to_section_code' => $sectionCode,
            'item_id' => $returnItem->item_ky ?? null,
            'item_code' => $returnItem->item_code,
            'item_name' => $returnItem->item_name,
            'stock_id' => $stockEntry->TableKy,
            'quantity' => $returnItem->quantity,
            'cost_price' => $returnItem->unit_price,
            'transfer_date' => $returnDate,
            'notes' => "Customer return from invoice - {$returnItem->customerReturn->original_invoice_no}",
            'company_code' => $companyCode,
            'batch_no' => $returnItem->batch_no ?? '',
        ]);
    }
}
```

### Printer Items (Serial Numbers)

Printers are always added individually (quantity = 1).

#### Stock Entry Created

```php
StockInHand::create([
    'uuid' => (string) \Illuminate\Support\Str::uuid(),
    'RefNo' => $returnNo,
    'company_code' => $companyCode,
    'owner_company_code' => $companyCode,
    'section_code' => $sectionCode,
    'OrdDate' => $returnDate,
    'ItemKy' => $returnItem->item_ky,
    'Qty' => 1,  // ← Always 1 for serialized items
    'FreeQty' => 0,
    'TrnTyp' => 'CUSTOMER_RETURN',
    'batch_no' => $returnItem->batch_no ?: null,
    'serial_number' => $returnItem->serial_number,
    'brand' => $returnItem->brand,
    'model' => $returnItem->model,
    'warranty' => $returnItem->warranty,
]);
```

#### Printer Location Updated

```php
$purchaseDetail = \App\Models\PurchaseDet::where('serial_number', $returnItem->serial_number)
    ->where('company_code', $companyCode)
    ->first();

if ($purchaseDetail) {
    $purchaseDetail->update([
        'section_code' => $sectionCode,
        'stock_location_type' => 'printing_section',
    ]);
}
```

#### Stock Transfer Created

```php
StockTransfer::create([
    'transfer_number' => $returnNo,
    'from_section_code' => $originalSection ?? $sectionCode,
    'to_section_code' => $sectionCode,
    'item_id' => $returnItem->item_ky ?? null,
    'item_code' => $returnItem->item_code,
    'item_name' => $returnItem->item_name,
    'stock_id' => $purchaseDetail->PerchaseDetKy ?? 0,
    'quantity' => 1,
    'cost_price' => $returnItem->unit_price,
    'transfer_date' => $returnDate,
    'notes' => "Printer return - SN: {$returnItem->serial_number}",
    'company_code' => $companyCode,
    'serial_number' => $returnItem->serial_number,
    'brand' => $returnItem->brand,
    'model' => $returnItem->model,
    'warranty' => $returnItem->warranty,
]);
```

### Damaged/Defective Items

Items with `condition != 'good'` are **NOT added back to stock**.

- No `StockInHand` entry created
- No `StockTransfer` created
- Item is written off / scrapped
- Condition and damage notes recorded on `CustomerReturnItem`

---

## Exchange Processing

Exchange items are replacement goods given to the customer. They flow **OUT** of stock.

### For Each Exchange Item

```php
foreach (($validated['exchange_items'] ?? []) as $exData) {
    $exItemTotal = ($exData['quantity'] * $exData['unit_price'])
                 - ($exData['discount_amount'] ?? 0)
                 + ($exData['tax_amount'] ?? 0);
    $exchangeTotal += $exItemTotal;

    // Create exchange item record (marked as 'out')
    $exchangeReturnItem = CustomerReturnItem::create([
        'customer_return_id' => $customerReturn->id,
        'item_direction' => 'out',  // ← Marks as outgoing
        'item_code' => $exData['item_code'],
        'item_ky' => $exData['item_ky'] ?? null,
        'item_name' => $exData['item_name'],
        'quantity' => $exData['quantity'],
        'unit_price' => $exData['unit_price'],
        'discount_amount' => $exData['discount_amount'] ?? 0,
        'tax_amount' => $exData['tax_amount'] ?? 0,
        'total_amount' => $exItemTotal,
        'batch_no' => $exData['batch_no'] ?? null,
        'serial_number' => $exData['serial_number'] ?? null,
        'item_type' => $exData['item_type'] ?? 'item',
        'condition' => 'good',
        'add_to_stock' => false,
        'stock_location_code' => $user->section_code,
    ]);

    // Deduct from stock
    $this->deductFromStock($exchangeReturnItem, $user->section_code, $user->company_code);
}
```

### Stock Deduction

Creates a **negative stock entry** (stock going out):

```php
private function deductFromStock($exchangeItem, $sectionCode, $companyCode)
{
    $userId = Auth::id() ?? 0;
    $returnDate = optional($exchangeItem->customerReturn)->return_date ?? now();
    $returnNo = optional($exchangeItem->customerReturn)->return_no ?? 'EXCHANGE';

    StockInHand::create([
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
        'RefNo' => $returnNo,
        'company_code' => $companyCode,
        'owner_company_code' => $companyCode,
        'section_code' => $sectionCode,
        'OrdDate' => $returnDate,
        'ItemKy' => $exchangeItem->item_ky,
        'Qty' => -1 * abs($exchangeItem->quantity),  // ← NEGATIVE
        'FreeQty' => 0,
        'TrnTyp' => 'CUSTOMER_EXCHANGE',
        'OrdKy' => $exchangeItem->customer_return_id,
        'batch_no' => $exchangeItem->batch_no ?: null,
        'serial_number' => $exchangeItem->serial_number ?? null,
        'Cky' => 0,
    ]);
}
```

---

## Financial Adjustments

The original `SalesTransaction` is updated based on refund method.

### Formula

```
Original Sale:
  total_amount = original selling price
  balance_amount = amount still owed
  already_paid = total_amount - balance_amount

After Return:
  new_total = original_total - return_value
  new_balance = max(0, new_total - already_paid)
  new_status = balance <= 0 ? 'completed' : 'partially_paid'
```

### Case 1: Cash Refund

Customer gets cash back. Invoice shrinks.

```php
if ($validated['refund_method'] === 'cash' && $customerReturn->refund_amount > 0) {
    $refundAmt = abs($customerReturn->refund_amount);
    
    $alreadyPaid = (float)$salesTransaction->total_amount 
                 - (float)$salesTransaction->balance_amount;
    
    $newTotal = max(0, (float)$salesTransaction->total_amount - $refundAmt);
    $newBalance = max(0, $newTotal - $alreadyPaid);
    $newStatus = $newBalance <= 0 ? 'completed' : 'partially_paid';
    
    $salesTransaction->update([
        'total_amount' => $newTotal,
        'balance_amount' => $newBalance,
        'status' => $newStatus,
    ]);
}
```

**Example:**
```
Original Sale:
- total_amount = 1000
- already_paid = 1000
- balance_amount = 0

Return 200:
- new_total = 1000 - 200 = 800
- new_balance = max(0, 800 - 1000) = 0
- new_status = 'completed' ✓
```

### Case 2: Partial Refund

Similar to cash, but may leave customer with credit if they didn't pay full original amount.

```php
if ($validated['refund_method'] === 'partial' && $customerReturn->refund_amount > 0) {
    // Same logic as cash
}
```

### Case 3: Exchange

Returned items come back, exchange items go out. Net effect on invoice:

```php
if ($validated['refund_method'] === 'exchange') {
    $returnValue = abs($customerReturn->refund_amount ?? 0);
    $exchangeValue = $exchangeTotal;
    
    if ($returnValue > 0 || $exchangeValue > 0) {
        $alreadyPaid = (float)$salesTransaction->total_amount 
                     - (float)$salesTransaction->balance_amount;
        
        // Net: removal of returned items, addition of exchange items
        $newTotal = max(0, (float)$salesTransaction->total_amount
                           - $returnValue
                           + $exchangeValue);
        $newBalance = max(0, $newTotal - $alreadyPaid);
        $newStatus = $newBalance <= 0 ? 'completed' : 'partially_paid';
        
        $salesTransaction->update([
            'total_amount' => $newTotal,
            'balance_amount' => $newBalance,
            'status' => $newStatus,
        ]);
    }
}
```

**Example:**
```
Original Sale:
- total_amount = 1000
- already_paid = 500
- balance_amount = 500

Customer returns 200 worth, exchanges for 150 worth:
- return_value = 200
- exchange_value = 150
- net = -50 (customer gets 50 credit)

- new_total = 1000 - 200 + 150 = 950
- new_balance = max(0, 950 - 500) = 450 (customers owes 450 more)
- new_status = 'partially_paid'
```

### Case 4: Credit (Register Customers Only)

Customer account balance updated, no physical cash yet.

---

## Key Business Rules

### ✅ Stock Returns

- Stock ALWAYS returns to the **section that sold it**, not the processing section
- Exceptions: Walk-in returns (no invoice) go to main stock section
- Tracked via `StockTransfer` if sections differ

### ✅ Returnable Qty Guard

- Can't return more qty than was sold (minus already returned)
- Prevents over-returns and stock inflation
- Calculated per item per invoice

### ✅ Condition Handling

| Condition | Action |
|-----------|--------|
| **good** | Add to stock (if `add_to_stock=true`) |
| **damaged** | Do NOT add to stock (write-off) |
| **defective** | Do NOT add to stock (write-off) |

### ✅ Exchange Items

- Items with `item_direction='out'` represent goods given to customer
- Deducted from stock using **negative** `StockInHand` entries
- Value affects the final invoice total

### ✅ Financial Tracking

- Original sale shrinks when cash/partial refund given
- Net calculation for exchanges (return value - exchange value)
- Balance recalculated; status updated accordingly

### ✅ Serial Number Tracking

- Printers maintain serial_number, brand, model, warranty through return
- Location updated in `PurchaseDet` table
- Quantity always 1 (one printer = one unit)

### ✅ Multi-Section Awareness

- Returns can originate from one section and be processed in another
- `StockTransfer` records show flow between sections
- Original sale section preserved for proper stock restoration

### ✅ Audit Trail

- All returns create `CustomerReturn` + `CustomerReturnItem` records
- `TrnTyp='CUSTOMER_RETURN'` and `TrnTyp='CUSTOMER_EXCHANGE'` track movement
- Linked to original sale via `sales_transaction_id`

---

## Database Models

### CustomerReturn
```php
{
    id,
    return_no,                    // Unique return number per section
    return_date,                  // When return was processed
    customer_name,                // Customer details
    customer_code,
    customer_id,                  // Link to Customer model
    sales_transaction_id,         // Link to original sale (nullable)
    original_invoice_no,          // Display of original invoice (nullable)
    section_code,                 // Section processing return
    company_code,                 // Company context
    return_type,                  // 'item' | 'printer' | 'mixed'
    total_return_amount,          // Sum of returned items
    return_value,                 // Amount credited for returns
    refund_amount,                // Amount refunded
    exchange_amount,              // Value of exchange items
    refund_method,                // 'cash' | 'exchange' | 'credit' | 'partial'
    refund_details,               // JSON additional info
    status,                       // 'pending' | 'completed' | 'cancelled'
    reason,                       // Why returned
    notes,                        // Additional notes
    processed_by,                 // User ID who created return
    processed_at,                 // When created
}
```

### CustomerReturnItem
```php
{
    id,
    customer_return_id,           // Link to CustomerReturn
    item_direction,               // NULL/'in' (returned) | 'out' (exchanged)
    item_code,                    // Product code
    item_ky,                      // Item master ID
    item_name,                    // Product name
    quantity,                     // How many
    unit_price,                   // Price per unit
    discount_amount,              // Discount on this item
    tax_amount,                   // Tax on this item
    total_amount,                 // Calculated total
    batch_no,                     // For batch tracking
    serial_number,                // For printer tracking
    brand,                        // Printer brand
    model,                        // Printer model
    warranty,                     // Warranty info
    item_type,                    // 'item' | 'printer'
    condition,                    // 'good' | 'damaged' | 'defective'
    damage_notes,                 // Why damaged (nullable)
    add_to_stock,                 // Whether to restore to inventory
    stock_location_type,          // 'section'
    stock_location_code,          // Section code
    original_sale_item_id,        // Reference to SalesTransactionItem
}
```

---

## API Endpoints

### List Returns
```
GET /customer-returns
Query Params:
  - search: search by return_no, customer_name, original_invoice_no
  - status: filter by status
  - return_type: filter by type (item|printer|mixed)
  - date_from, date_to: date range
```

### View Return
```
GET /customer-returns/{id}
```

### Create Return
```
POST /customer-returns
Body: JSON (see validation rules in store())
```

### Generate Receipt PDF
```
GET /customer-returns/{id}/generate-receipt
```

### Search Endpoints
```
GET /customer-returns/search/customers
  Query: ?search=name/code

GET /customer-returns/search/items
  Query: ?search=code/name

GET /customer-returns/search/printers
  Query: ?search=serial/model

GET /customer-returns/get-sales-by-invoice
  Query: ?invoice_no=INV-001
```

---

## Example Workflow

### Scenario: Customer Returns 2 Units of Item X

**Original Sale:**
- Invoice: INV-001
- Item X (qty 10) @ 100 each = 1000
- Paid in full

**Return:**
- Item X (qty 2, condition=good, add_to_stock=true)
- Refund method: cash

**What Happens:**

1. ✅ Create `CustomerReturn` (return_no=RET-00001)
2. ✅ Create `CustomerReturnItem` for 2x Item X
3. ✅ Verify returnable qty: Sold 10, returning 2, returnable = 10 ✓
4. ✅ Add 2x Item X to stock (`TrnTyp='CUSTOMER_RETURN'`, qty=2)
5. ✅ Update `SalesTransaction`:
   - total_amount: 1000 → 800
   - balance_amount: 0 → 0
   - status: completed
6. ✅ Create `CustomerPayment` (negative amount for cash out)
7. ✅ Mark return as `status='completed'`

**Result:**
- 2 units back in inventory
- Invoice now shows 800 total
- 200 cash paid to customer
- Full audit trail created

---

## Error Handling

### Over-Return Attempt
```
Cannot return 5 of "Item X". 
Only 3 unit(s) can still be returned (sold: 10, already returned: 7).
```

### Invoice Not Found
```
Invoice INV-001 not found
```

### Permission Denied
```
Unauthorized. You do not have permission to create customer returns.
```

All errors trigger transaction rollback (`DB::rollBack()`).

---

## Logging

The system logs important events to Laravel's logger:

```php
Log::info('Storing customer return', [...]);
Log::info('Adding to stock', [...]);
Log::info('Item returned to stock', [...]);
Log::info('Printer returned to stock', [...]);
Log::info('Customer exchange: item given out', [...]);
Log::info('Exchange item deducted from stock', [...]);
Log::info('Sale total adjusted for customer return', [...]);
Log::info('Customer refund payment created', [...]);
Log::error('Failed to create refund payment', [...]);
```

---

## Related Documentation

- [SalesController.php](../app/Http/Controllers/SalesController.php) - Sales creation (inverse of returns)
- [CUSTOMER_RETURN_IMPLEMENTATION.md](./CUSTOMER_RETURN_IMPLEMENTATION.md) - Full implementation details
- [Stock Management Docs](./STOCK_MANAGEMENT.md) - How stock_in_hand works

---

## Version History

- **v1.0** (2026-03-25): Initial documentation
  - Return creation flow
  - Stock management for items and printers
  - Financial adjustments
  - Exchange processing

