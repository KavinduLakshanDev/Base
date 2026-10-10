# Unit Conversion in Cross-Company Stock Transfer — Full Implementation Plan

## Background (System Analysis)

| Component | Current State |
|---|---|
| `itemmaster` | Has `UnitKy` (single unit per product), `PackQty` (unused legacy field) |
| `stock_transfers` | Stores `quantity` as a single decimal — no concept of sender/receiver unit |
| `StockTransfer::executeTransfer()` | Writes one OUT record (source) and one IN record (destination) at the same quantity |
| Unit master | Lives in `code_masters` where `conkey = 'UNT'`, keyed by `id` |
| Cross-company detection | Already implemented via `$isCrossCompanyTransfer` flag in `StockTransferController` |
| No unit conversion logic exists anywhere | — |

### Example
Vismass stocks **A4 Sheet Bundle** (1 bundle = 10 sheets).  
When transferred to Malibo, Malibo receives **A4 Sheets** (individual sheets).  
→ Sending 5 Bundles must result in 50 Sheets being credited to Malibo's stock.

---

## Architecture Decision

A **three-column approach directly on `itemmaster`** (not a separate table) is the right choice here because:
- Only two companies exist (Vismass ↔ Malibo)
- Conversion is always the same for a given product (1 bundle always = 10 sheets)
- Keeps joins minimal in transfer queries

---

## Phase 1 — Database Migrations

### 1A. Add unit conversion columns to `itemmaster`

**File:** `database/migrations/xxxx_add_unit_conversion_to_itemmaster_table.php`

Add three columns to `itemmaster`:

| Column | Type | Default | Description |
|---|---|---|---|
| `transfer_unit_id` | INT nullable | null | FK → `code_masters.id` — unit Vismass sends in |
| `receiving_unit_id` | INT nullable | null | FK → `code_masters.id` — unit Malibo receives in |
| `transfer_conversion_factor` | DECIMAL(15,4) | 1.0000 | How many receiving units = 1 sending unit |

**Rule:** If `receiving_unit_id` is null OR `transfer_conversion_factor = 1`, no conversion is applied (same unit transfer). Fully backward compatible.

### 1B. Add audit columns to `stock_transfers`

**File:** `database/migrations/xxxx_add_unit_conversion_columns_to_stock_transfers_table.php`

| Column | Type | Default | Description |
|---|---|---|---|
| `sent_unit_id` | INT nullable | null | Unit used by sender |
| `received_unit_id` | INT nullable | null | Unit used by receiver |
| `received_quantity` | DECIMAL(10,4) nullable | null | Actual qty added to destination stock |
| `conversion_factor` | DECIMAL(15,4) | 1.0000 | Snapshot of conversion factor at time of transfer |
| `reverse` | BOOLEAN | false | `1` if the transfer was performed in reverse direction (to→from units) |

---

## Phase 2 — Product Model

**File:** `app/Models/Product.php`

Add the three new `itemmaster` fields to `$fillable` and `$casts`:

```php
// In $fillable:
'transfer_unit_id',
'receiving_unit_id',
'transfer_conversion_factor',

// In $casts:
'transfer_conversion_factor' => 'decimal:4',
```

---

## Phase 3 — ProductController — Backend

*Note*: the conversion UI now allows choosing a **direction**.  A flag (`reverse`) is stored on each record and influences how quantities are calculated and displayed.  The reverse operation simply swaps the from/to units and uses `1/transfer_conversion_factor` for the output calculation.  Stock validation remains unit‑agnostic (see discussion below).

**File:** `app/Http/Controllers/POS/ProductController.php`

In both `store()` and `update()` validation rules, add:

```php
'transfer_unit_id'            => 'nullable|integer|exists:code_masters,id',
'receiving_unit_id'           => 'nullable|integer|exists:code_masters,id|different:transfer_unit_id',
'transfer_conversion_factor'  => 'nullable|numeric|min:0.0001',
```

**Custom validation rule:** If `receiving_unit_id` is set, `transfer_conversion_factor` must be > 1 (otherwise no conversion is needed).

Pass the units with their names to the create/edit view so the frontend can populate both dropdowns.

---

## Phase 4 — Product Create/Edit — Frontend

**File:** `resources/js/pages/pos/products/create.tsx`

Add an optional **"Unit Conversion"** collapsible section below the main unit selector (only visible when `canManage` is true):

```
┌─────────────────────────────────────────────────┐
│  ▼ Cross-Company Unit Conversion (Optional)     │
├─────────────────────────────────────────────────┤
│  Sending Unit:   [ Bundle        ▼ ]            │
│  Receiving Unit: [ Sheet         ▼ ]            │
│  Conversion:     [ 10           ]               │
│                                                 │
│  Preview: 1 Bundle  →  10 Sheets               │
└─────────────────────────────────────────────────┘
```

- **Sending Unit** defaults to the product's primary `UnitKy` unit
- Both dropdowns are populated from the `units` prop already passed to the page
- Show a live preview label: `"1 {sendingUnit} → {factor} {receivingUnit}"`
- If conversion factor is left blank or 1, the fields are ignored on save

---

## Phase 5 — StockTransferController — `store()` Backend

**File:** `app/Http/Controllers/StockTransferController.php`

No changes to the **quantity validation or stock-check logic** — validation still uses the sender's unit quantity.

In the `StockTransfer::create([...])` call, add:

```php
'sent_unit_id'      => $item->transfer_unit_id,
'received_unit_id'  => $item->receiving_unit_id,
'conversion_factor' => $item->transfer_conversion_factor ?? 1,
'received_quantity' => $itemData['quantity'] * ($item->transfer_conversion_factor ?? 1),
```

**Important:** Only apply conversion when it is a **cross-company transfer** AND the item has `transfer_conversion_factor > 1`. For same-company transfers, `received_quantity` should equal `quantity`.

Also expose `transfer_unit_id`, `receiving_unit_id`, `transfer_conversion_factor`, unit names on the items list passed to the `StockTransfer/Create` Inertia view.

---

## Phase 6 — StockTransfer Model — `executeTransfer()`

**File:** `app/Models/StockTransfer.php`

This is the **core logic change**. Currently `executeTransfer()` inserts one OUT row and one IN row at the same quantity.

### New logic:

```
$outQty = $this->quantity            // sender's unit qty  (e.g. 5 bundles)
$inQty  = $this->received_quantity   // receiver's unit qty (e.g. 50 sheets)
          ↑ already calculated and stored on the transfer record

OUT row (source section — stock_in_hand):
    Qty = -$outQty      [no change to current logic]

IN row (destination section — stock_in_hand):
    Qty = +$inQty       ← uses received_quantity, NOT quantity
    CosPri = (transfer cost_price * outQty) / inQty   ← maintain correct cost-per-receiving-unit
```

- The IN row's `OrdType` stays `'TRF-IN'`
- If `received_quantity` is null, fall back to `quantity` (safe for existing transfers)

---

## Phase 7 — StockTransfer Create — Frontend

**File:** `resources/js/pages/StockTransfer/Create.tsx`

When a line item is selected that has `transfer_conversion_factor > 1` AND the transfer is cross-company, display a conversion badge below the quantity input:

```
┌───────────────────────────────────────────────────┐
│  Item: A4 Sheet Bundle            Qty: [ 5 ]      │
│  ℹ Malibo will receive: 50 Sheets                 │
└───────────────────────────────────────────────────┘
```

- The "will receive" label updates live as the user changes the quantity
- Uses: `displayQty = qty * conversionFactor`, `receivingUnitName` from item data
- Only shown when `fromSection.company_code !== toSection.company_code` (cross-company)

---

## Phase 8 — StockTransfer Index / Show

**File:** `resources/js/pages/StockTransfer/Index.tsx`  
**File:** `resources/js/pages/StockTransfer/Show.tsx` (if exists)

For transfers with `conversion_factor > 1`, display both quantities in the table/detail view:

```
Sent:     5 Bundles
Received: 50 Sheets
```

Otherwise show the single quantity as before (no visual change for existing transfers).

---

## Phase 9 — StockTransfer Model — `$fillable` and `$casts`

**File:** `app/Models/StockTransfer.php`

Add to `$fillable`:

```php
'sent_unit_id',
'received_unit_id',
'received_quantity',
'conversion_factor',
```

Add to `$casts`:

```php
'received_quantity' => 'decimal:4',
'conversion_factor' => 'decimal:4',
```

---

## Implementation Order

```
Phase 1  → Migrations (itemmaster + stock_transfers)
Phase 2  → Product Model ($fillable / $casts)
Phase 3  → ProductController validation (store + update)
Phase 4  → Product create.tsx UI (unit conversion section)
Phase 5  → StockTransferController store() — attach conversion data
Phase 9  → StockTransfer Model $fillable + $casts
Phase 6  → StockTransfer::executeTransfer() — apply received_quantity on IN row
Phase 7  → StockTransfer/Create.tsx — conversion preview badge
Phase 8  → StockTransfer/Index.tsx — display both quantities
```

---

## Key Business Rules

| # | Rule | Detail |
|---|---|---|
| 1 | Conversion only applies on cross-company transfers | Same-company transfers always use qty as-is, even if conversion is defined |
| 2 | Stock validation uses sender's unit | `quantity > availableStock` check stays in sender's unit (no change needed) |
| 3 | Cost per unit is recalculated on receive | Cost per sheet = (cost per bundle) / conversion_factor |
| 4 | `conversion_factor = 1` or null = no conversion | Fully backward compatible with all existing products |
| 5 | Sending unit defaults to product's `UnitKy` | No breaking change to existing products |
| 6 | `received_quantity` stored on transfer | Immutable audit record — does not change if product conversion is later edited |
| 7 | Both unit IDs stored on transfer | Allows Index/Show to label quantities with correct unit names |

---

## Files Affected Summary

| File | Change Type |
|---|---|
| `database/migrations/xxxx_add_unit_conversion_to_itemmaster_table.php` | New migration |
| `database/migrations/xxxx_add_unit_conversion_columns_to_stock_transfers_table.php` | New migration |
| `app/Models/Product.php` | Add fields to `$fillable` / `$casts` |
| `app/Http/Controllers/POS/ProductController.php` | Add validation + pass units to view |
| `resources/js/pages/pos/products/create.tsx` | Add conversion UI section |
| `app/Http/Controllers/StockTransferController.php` | Attach conversion data on `store()` |
| `app/Models/StockTransfer.php` | Add fields to `$fillable` / `$casts`, update `executeTransfer()` |
| `resources/js/pages/StockTransfer/Create.tsx` | Add conversion preview badge |
| `resources/js/pages/StockTransfer/Index.tsx` | Display received_quantity when different |
