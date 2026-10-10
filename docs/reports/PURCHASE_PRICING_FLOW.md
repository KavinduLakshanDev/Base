# Purchase (GRN) Pricing System - Complete Price Change Flow

## Overview
The purchase (GRN - Goods Received Note) system is **price-driven**. When a product is purchased, the system can update multiple price fields on the existing product master, allowing new costs to propagate through the system.

---

## All Price Fields in Purchase Item

When creating a GRN/Purchase, each line item collects the following prices:

### Core Prices (4 main prices)
1. **cost_price** - What you're paying for this item (input on purchase)
2. **normal_cost** - Normalized cost (can differ from cost_price)
3. **retail_price** - Selling price for normal sales (SlsPri in product)
4. **wholesale_price** - Bulk discount price (WholePrice in product)
5. **extra_price** - Premium/special price (ExtraPrice in product)
6. **cc_price** - Corporate/channel price (CCPrice in product)

### Calculated/Derived Prices
7. **new_cost_price** - Cost price after applying quantity discount
   - Formula: `(discountedCost × paid_qty) / total_qty`
   - Where `discountedCost = cost_price - (cost_price × discount_rate%)`
   - And `total_qty = qty + free_qty`

### Discount Fields
8. **discount_rate** - Purchase discount % (on this line item)
9. **cus_discount_rate** - Customer discount % (additional discount)
10. **item_discount** - Calculated: `(cost_price × qty × discount_rate) / 100`

### Other Calculated Fields
11. **free_qty** - Free items received with purchase
12. **amount** - Line item amount: `(cost_price × qty) - item_discount`

---

## What Prices Are Loaded FROM Products

When you select a product in the purchase form, the system loads:

```javascript
// From ProductController.getProductsByBranch or backend product query
const loadedPrices = {
    cost_price: product.CosPri,           // Current cost price
    normal_cost: product.NCostPrice,      // Normalized cost (NCostPrice)
    retail_price: product.SlsPri,         // Current retail/sales price
    wholesale_price: product.WholePrice,  // Current wholesale price
    extra_price: product.ExtraPrice,      // Current extra price
    cc_price: product.CCPrice,            // Current corporate/channel price
    current_stock: product.current_stock, // For reference only
    brand: product.brand,                 // From product details
    model: product.model,
    serial_number: product.serial_number,
    warranty: product.warranty,
}
```

These come from the **itemmaster** table (current prices).

---

## What Prices GET UPDATED in Products

When the purchase is saved (store method), the system updates existing products:

### Flow:
```
Purchase Store → Check each item for price changes
    ↓
For each unique product_id:
    1. Load current product from itemmaster
    2. Compare ALL 6 prices with incoming purchase prices
    3. If ANY price changed:
        ✓ Create NEW record in item_price_det (price history)
        ✓ Update itemmaster with new prices
```

### Comparison Check:
```php
$hasChanged =
    $currentProduct->CosPri != $prices['cos_pri'] ||           // Cost price changed?
    $currentProduct->NCostPrice != $prices['n_cost_price'] ||  // Normal cost changed?
    $currentProduct->SlsPri != $prices['sls_pri'] ||           // Retail price changed?
    $currentProduct->WholePrice != $prices['whole_price'] ||   // Wholesale changed?
    $currentProduct->ExtraPrice != $prices['extra_price'] ||   // Extra price changed?
    $currentProduct->CCPrice != $prices['cc_price'];           // CC price changed?
```

### If Price Changed:
```
YES → Create row in item_price_det
    ├─ Status: 'A' (Active)
    ├─ All 6 prices: CosPri, NCostPrice, SlsPri, WholePrice, ExtraPrice, CCPrice
    ├─ Quantity discount tiers: RtQty1-4, RtDis1-4 (carried over from latest)
    ├─ ChangedDate: NOW
    └─ batch_no: Set from GRN batch

    AND Update itemmaster
    ├─ CosPri = new cost_price
    ├─ NCostPrice = new normal_cost
    ├─ SlsPri = new retail_price
    ├─ WholePrice = new wholesale_price
    ├─ ExtraPrice = new extra_price
    └─ CCPrice = new cc_price

NO → Skip price update
    └─ itemmaster remains unchanged
```

---

## Purchase Item Validation Rules

```php
'items.*.product_id' => 'required|integer',
'items.*.qty' => 'required|numeric|min:0',
'items.*.cost_price' => 'required|numeric|min:0',          // MUST have cost_price
'items.*.normal_cost' => 'nullable|numeric|min:0',          // Optional
'items.*.discount_rate' => 'nullable|numeric|min:0|max:100', // Optional, range 0-100%
'items.*.cus_discount_rate' => 'nullable|numeric|min:0|max:100',
'items.*.free_qty' => 'nullable|numeric|min:0',             // Optional
'items.*.retail_price' => 'nullable|numeric|min:0',         // Optional
'items.*.wholesale_price' => 'nullable|numeric|min:0',      // Optional
'items.*.extra_price' => 'nullable|numeric|min:0',          // Optional
'items.*.cc_price' => 'nullable|numeric|min:0',             // Optional
'items.*.new_cost_price' => 'nullable|numeric|min:0',       // Calculated, can be provided
```

**Key Point**: Only `cost_price` is required. All other prices are optional.

---

## New Product Creation During Purchase

If `product_id = 0` (new product creation in purchase):

### New Product Gets:
```php
$newProduct = Product::create([
    'Status' => 'A',              // Active
    'ItemCode' => 'MS-XXX-YYMMDD' or 'PS-XXX-YYMMDD', // Auto-generated
    'ItmNm' => $item['product_name'] ?? $item['brand'],
    'CosPri' => $costPrice,                    // From purchase item
    'NCostPrice' => $normal_cost,              // From purchase item
    'SlsPri' => $item['retail_price'] ?? 0,    // From purchase item
    'WholePrice' => $item['wholesale_price'] ?? 0,
    'ExtraPrice' => $item['extra_price'] ?? 0,
    'CCPrice' => $item['cc_price'] ?? 0,
    // ... batch_no, warranty, brand, model, barcode
]);

// AND corresponding item_price_det record with Status='A'
ItemPriceDet::create([
    // Exact same prices as above
    'CosPri' => $costPrice,
    'NCostPrice' => $normal_cost,
    'SlsPri' => $item['retail_price'] ?? 0,
    // ... all 6 prices
    'ChangedDate' => now(),
    'batch_no' => $batchNo,
]);
```

### Pricing Logic for New Items:
- **costPrice**: `$item['new_cost_price'] ?? $item['cost_price']`
  - Uses `new_cost_price` if provided (after discount), else `cost_price`

---

## Complete Example: Purchase with Price Changes

### Scenario: Existing Product with Old Prices

**Current Product in itemmaster:**
```
ItemCode: PROD-001
CosPri: 100          ← Old cost
SlsPri: 150          ← Old retail
WholePrice: 130      ← Old wholesale
ExtraPrice: 160      ← Old extra
CCPrice: 140         ← Old CC price
```

### Purchase Entry for Same Product:
```
item[0]:
  product_id: 5 (existing product)
  cost_price: 95          ← NEW (cheaper supplier)
  normal_cost: 95
  retail_price: 155       ← NEW (higher retail)
  wholesale_price: 135    ← NEW
  extra_price: 165        ← NEW
  cc_price: 145           ← NEW
  discount_rate: 5        ← 5% discount
  qty: 100
  free_qty: 10
```

### What Happens:

#### 1. Price Change Detection:
```
- CosPri:     100 != 95          ✓ CHANGED
- NCostPrice: 100 != 95          ✓ CHANGED
- SlsPri:     150 != 155         ✓ CHANGED
- WholePrice: 130 != 135         ✓ CHANGED
- ExtraPrice: 160 != 165         ✓ CHANGED
- CCPrice:    140 != 145         ✓ CHANGED

Result: hasChanged = true
```

#### 2. item_price_det Record Created:
```
INSERT INTO item_price_det:
  ItmKy: 5
  Status: 'A'
  CosPri: 95
  NCostPrice: 95
  SlsPri: 155
  WholePrice: 135
  ExtraPrice: 165
  CCPrice: 145
  RtQty1-4: (carried over from previous)
  RtDis1-4: (carried over from previous)
  ChangedDate: 2026-03-24 10:30:45
  batch_no: GRN-2026-COM-001
```

#### 3. itemmaster Updated:
```
UPDATE itemmaster SET:
  CosPri: 95           ← Updated
  NCostPrice: 95       ← Updated
  SlsPri: 155          ← Updated
  WholePrice: 135      ← Updated
  ExtraPrice: 165      ← Updated
  CCPrice: 145         ← Updated
WHERE ItmKy = 5
```

#### 4. Calculated new_cost_price:
```
discountRate = 5%
discountedCost = 95 - (95 × 5%) = 95 - 4.75 = 90.25
totalQty = qty + free_qty = 100 + 10 = 110
new_cost_price = (90.25 × 100) / 110 = 82.05

Purchase saves:
  new_cost_price: 82.05
```

#### 5. PurchaseDet Line Item Stores:
```
INSERT INTO purchase_det:
  iTimKy: 5
  CostPrice: 95
  SalePrice: 155
  WholePrice: 135
  ExtraPrice: 165
  CCPrice: 145
  NormalCost: 95
  NewCostPrice: 82.05
  DiscountRate: 5
  Free: 10
  Qty: 100
  AmountF: (95 × 100) - (95 × 100 × 5 / 100) = 9500 - 475 = 9025
```

---

## Price Change Propagation

### From Purchase → Product:
```
Purchase → Triggers product price update
    ├─→ itemmaster updated (live prices)
    ├─→ item_price_det new record (audit trail)
    └─→ PurchaseDet stores line prices (transaction record)
```

### Next Sales Transaction:
When someone sells the product after this GRN:
```
Sales uses itemmaster prices:
  - Cost: 95 (new)
  - Retail: 155 (new)
  - Wholesale: 135 (new)
  - etc.
```

### Price History Available:
```
SELECT * FROM item_price_det 
WHERE ItmKy = 5 
ORDER BY ChangedDate DESC
→ Shows all historical prices with timestamps
```

---

## Discount Tier Carry-Over

When updating product prices via purchase, **quantity discount tiers are preserved**:

```php
'RtQty1' => $currentPriceDet->RtQty1 ?? $currentProduct->RtQty1 ?? 0,
'RtDis1' => $currentPriceDet->RtDis1 ?? $currentProduct->RtDis1 ?? 0,
'RtQty2' => $currentPriceDet->RtQty2 ?? $currentProduct->RtQty2 ?? 0,
'RtDis2' => $currentPriceDet->RtDis2 ?? $currentProduct->RtDis2 ?? 0,
// ... RtQty3-4, RtDis3-4
```

**Logic**: Uses latest item_price_det record's tiers, otherwise uses current itemmaster tiers.

---

## Key Differences: Purchase vs Product Edit

| Aspect | Purchase | Product Edit |
|--------|----------|--------------|
| **Trigger** | GRN received | Admin changes prices manually |
| **Price Creation** | Always creates new item_price_det | Optional (saveToPrice flag) |
| **History** | One record per GRN with prices | User controls (new record or update latest) |
| **New Products** | Can create product + price | Creates product + mandatory price |
| **Discount Tiers** | Carries over automatically | Preserved from selected history |
| **Status in item_price_det** | 'A' (Active) | 'I' (Insert) or 'U' (Update) |

---

## What Does NOT Change in Purchase

When processing a GRN, these fields are **NOT updated** in itemmaster:

```
❌ ItemCode (never changes)
❌ BarCode (can change in product, not forced by purchase)
❌ UnitKy (unit of measure - not from purchase)
❌ ReOrdlLvl (reorder level - not from purchase)
❌ RtQty1-4, RtDis1-4 (tiers are carried over, not replaced)
❌ catkey (category - not from purchase)
❌ Available Business Units (not from purchase)
❌ VATItem (tax flag - inferred from stock location, not price field)
```

---

## Edge Cases

### Case 1: Only Cost Price Changes
```
If only cost_price changed but retail stays same:
- Still creates item_price_det record
- Updates itemmaster.CosPri only
- Example: Cheaper supplier found
```

### Case 2: Multiple Items, Same Product
```
If 2 purchase lines have same product_id but different prices:
- Takes FIRST occurrence's prices
- Updates product once
- Other lines processed but skipped for product update
  (Example: Buying from 2 suppliers in one GRN)
```

### Case 3: New Product, No Existing Prices
```
If product_id = 0 (new item):
- Skips product update (no product to update)
- Creates NEW product in itemmaster
- Creates NEW record in item_price_det
```

### Case 4: Production Item (cost_price = 0)
```
If cost_price = 0 (shouldn't happen typically):
- Still allowed by validation (nullable)
- Updates product with CosPri = 0
- May affect stock valuation
```

---

## Database Tables Involved

| Table | Role | Price Fields |
|-------|------|-------------|
| **itemmaster** | Current master | CosPri, NCostPrice, SlsPri, WholePrice, ExtraPrice, CCPrice |
| **item_price_det** | History | CosPri, NCostPrice, SlsPri, WholePrice, ExtraPrice, CCPrice + tiers |
| **purchase_det** | Transaction | CostPrice, SalePrice, WholePrice, ExtraPrice, CCPrice, NormalCost, NewCostPrice |
| **stock_in_hand** | Stock tracking | (No prices, qty only) |

---

## Summary: Price Change Sources

In a Purchase GRN:

1. **6 Main Prices** can change per item
2. **Cost-based**: cost_price (required input)
3. **Sales-based**: retail_price, wholesale_price, extra_price, cc_price (optional)
4. **Normalized**: normal_cost (optional, defaults to cost_price)
5. **Calculated**: new_cost_price (after discount math)
6. **Discount-related**: discount_rate, cus_discount_rate, item_discount (calculations)
7. **Quantity-based**: qty, free_qty (affects new_cost_price)

**End Result**: Every GRN has potential to update product master with new purchase prices, creating a complete audit trail in item_price_det.

