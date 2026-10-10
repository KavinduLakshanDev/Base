# Product Pricing System - Complete Flow

## Overview
The product create/edit system has a sophisticated pricing mechanism that handles multiple price points, discounts, and maintains a complete price history.

---

## Price Fields Collected

### Primary Prices (4 main prices)
1. **CosPri** - Cost Price (what you pay suppliers)
2. **SlsPri** - Sales/Retail Price (standard selling price)
3. **WholePrice** - Wholesale Price (bulk discount price)
4. **ExtraPrice** - Extra Price (special/premium price)

### Discount Tiers (Quantity-based discounts)
- **RtQty1, RtQty2, RtQty3, RtQty4** - Quantity thresholds
- **RtDis1, RtDis2, RtDis3, RtDis4** - Discount percentages for each tier

### Optional Batch Information
- **batch_no** - Links prices to a specific purchase batch (optional)

### Business Logic Fields
- **free_issue_scheme_buy_qty / get_qty** - Buy 2, Get 1 schemes
- **wholesale_min_qty** - Minimum quantity for wholesale pricing

---

## Storage Tables

### 1. **itemmaster** (Main Product Table)
Stores the **current** prices for each product:
```
- ItmKy (Primary Key)
- ItemCode
- ItmNm
- CosPri (current cost price)
- SlsPri (current retail price)
- WholePrice (current wholesale price)
- ExtraPrice (current extra price)
- RtQty1-4, RtDis1-4 (current discount tiers)
- batch_no (if product is batch-specific)
```

### 2. **item_price_det** (Price History Table)
Maintains **complete history** of all price changes:
```
- ItemPriceKey (Primary Key - unique for each price record)
- ItmKy (Foreign Key to itemmaster)
- ItemCode
- Status (I=Insert, U=Update)
- ChangedDate (when price was set)
- CosPri, SlsPri, WholePrice, ExtraPrice
- RtQty1-4, RtDis1-4 (historical discounts)
- batch_no (if batch-specific)
- company_code, section_code
```

### 3. **purchase_det** (Purchase Details - if batch_no provided)
If a batch_no is specified, prices are synced to purchase line items for that batch:
```
- batch_no (links to purchase)
- ItmKy
- CosPri, SlsPri, WholePrice (updated to match product prices)
```

---

## Product Creation Flow

```
Frontend (create.tsx)
    ↓
[Form collects all price fields]
    ↓
handleSubmit() builds payload
├─ CosPri, SlsPri, WholePrice, ExtraPrice
├─ RtQty1-4, RtDis1-4 (discounts)
├─ batch_no (optional)
└─ saveToPrice flag (default=false for new products)
    ↓
POST /pos/products (store method)
    ↓
Backend (ProductController.php)
    ↓
✓ Validate all inputs
✓ Set Status = 'I' (Insert)
✓ Create record in itemmaster
    ↓
    ├─→ savePriceDetails($product, $data, 'I')
    │   └─ Creates NEW record in item_price_det with Status='I'
    │       └ Stores: CosPri, SlsPri, WholePrice, ExtraPrice, discounts
    │
    └─→ If batch_no provided:
        └─ updatePurchaseDetPricesForBatch()
           └─ Syncs prices to purchase_det table for that batch
    ↓
✓ Generate barcode print batch
✓ Redirect with success
```

**Key Point**: On creation, prices are ALWAYS saved (not optional).

---

## Product Edit/Update Flow

### User has 3 Options:

#### Option 1️⃣: Update Latest Price Record (DEFAULT - `keepPrice = false`)
```
payload.keep_price = false
payload.selectedPriceHistoryId = null
    ↓
update() checks: priceOrDiscountChanged?
    ↓
YES → Fetch LATEST price record from item_price_det
    │   └─ Update that record with Status='U' (Update)
    │   └─ Update ChangedDate to NOW
    ├─ Keeps history intact (only 1 record per time period)
    └─ Old prices still visible via ChangedDate
    ↓
NO → Skip price update (only update non-price fields)

If batch_no provided:
    └─ updatePurchaseDetPricesForBatch()
       └─ Sync new prices to purchase_det
```

#### Option 2️⃣: Create New Price Record (History Keeping - `keepPrice = true`)
```
payload.keep_price = true
payload.selectedPriceHistoryId = null
    ↓
update() checks: priceOrDiscountChanged?
    ↓
YES → Call savePriceDetails($item, $data, 'U')
    │   └─ Creates NEW record in item_price_det
    │   └ Previous record remains unchanged (new history entry)
    │   └─ Status = 'U' marks this as an update
    │
    └─ Creates price trail: [I] → [U] → [U] → ...
    ↓
NO → Skip price update
```

#### Option 3️⃣: Edit Specific Price History Record (selectedPriceHistoryId set)
```
payload.selectedPriceHistoryId = 123
    ↓
update() checks: priceOrDiscountChanged?
    ↓
YES → Find price record with ItemPriceKey = 123
    └─ Update ONLY that specific record
    └─ Set Status = 'U'
    └─ Update ChangedDate to NOW
    └─ All other history records unchanged
    ↓
Useful for: Correcting past price mistakes
```

---

## Frontend Logic

### Form State in create.tsx

```javascript
// Price fields in form state
const form = {
    CosPri: '',        // Cost price
    SlsPri: '',        // Sales price
    WholePrice: '',    // Wholesale price
    ExtraPrice: '',    // Extra price
    RtQty1: '', RtDis1: '',  // Tier 1: quantity, discount %
    RtQty2: '', RtDis2: '',  // Tier 2
    RtQty3: '', RtDis3: '',  // Tier 3
    RtQty4: '', RtDis4: '',  // Tier 4
    batch_no: '',           // Optional batch linking
}

// Edit mode specific
const [saveToPrice, setSaveToPrice] = useState(isEditMode); 
// true = create new history record
// false = update latest record

const [selectedPriceHistory, setSelectedPriceHistory] = useState(null);
// If set, updates that specific historical record

const [currentPriceHistory, setCurrentPriceHistory] = useState([]);
// Array of all past prices for this item
```

### Price Change Detection

```javascript
const hasPriceChanged = () => {
    if (!product || !isEditMode) return true; // Creating = always changed
    
    const priceFields = ['CosPri', 'SlsPri', 'WholePrice', 'ExtraPrice'];
    
    return priceFields.some(field => {
        const current = parseFloat(form[field] || '0');
        const original = parseFloat(product[field] || '0');
        return Math.abs(current - original) > 0.01; // Allow floating point variance
    });
};
```

---

## Complete Status Flow

```
NEW PRODUCT CREATION
├─ Status = 'I' (Insert)
└─ item_price_det.Status = 'I'

FIRST EDIT (keepPrice=false)
├─ item_price_det first record: Status = 'I' (unchanged)
├─ item_price_det latest record: Status = 'U' → Updated
└─ itemmaster: Updated to new prices

SECOND EDIT (keepPrice=true)
├─ Previous records: Status unchanged
├─ NEW item_price_det record: Status = 'U'
└─ itemmaster: Updated to newest prices

EDIT SPECIFIC HISTORY
├─ Only that record: Status = 'U' → Updated
└─ All others: Unchanged
```

---

## Batch-Specific Pricing

If `batch_no` is provided during product creation/edit:

```
Frontend Form
    ├─ batch_no: "BATCH-001"
    └─ Prices: CosPri=100, SlsPri=150, ...
        ↓
updatePurchaseDetPricesForBatch($product, batch_no, $data)
    ↓
UPDATE purchase_det
WHERE ItmKy = $product->ItmKy 
  AND batch_no = "BATCH-001"
SET CosPri = 100,
    SlsPri = 150,
    WholePrice = 200,
    ExtraPrice = 180
    ↓
Result: All purchase line items for that batch 
        get the new prices
```

---

## Key Validation Rules

### On Creation (store method)
```
- ItemCode: required, unique in itemmaster
- ItmNm: required, max 100 chars
- CosPri: nullable but numeric if provided
- SlsPri: nullable but numeric if provided
- WholePrice: nullable but numeric if provided
- ExtraPrice: nullable but numeric if provided
- RtQty1-4: nullable, must be integer if provided
- RtDis1-4: nullable, must be numeric if provided
- batch_no: optional string, max 100 chars
- Status set automatically to 'I'
```

### On Update (update method)
```
- Same as above, but:
  - ItemCode must be unique EXCEPT this product's ItemCode
  - Status set automatically to 'U'
  - keep_price is additional control flag
  - selectedPriceHistoryId can specify which record to update
```

---

## Example Scenarios

### Scenario 1: Create Product with Prices
```
User fills form:
- ItemCode: "PROD-001"
- ItmNm: "Coffee Beans"
- CosPri: 100
- SlsPri: 150
- WholePrice: 130
- batch_no: blank

Result:
✓ itemmaster row created (Status not stored here)
✓ item_price_det row created (Status='I', ChangedDate=now)
✓ Prices available for all sales
```

### Scenario 2: Edit Product → Update Latest Price
```
User edits same product:
- Changes SlsPri: 150 → 160
- saveToPrice checkbox: UNCHECKED (default in edit)

Result:
✓ itemmaster updated (SlsPri=160)
✓ item_price_det latest record updated (Status='U', ChangedDate=now)
✓ Previous history remains but marked older
```

### Scenario 3: Edit Product → Keep Price History
```
User edits same product:
- Changes SlsPri: 160 → 170
- saveToPrice checkbox: CHECKED

Result:
✓ itemmaster updated (SlsPri=170)
✓ item_price_det: NEW record created (Status='U', ChangedDate=now)
✓ Old records untouched (can view edit history)
```

### Scenario 4: Edit Specific Past Price
```
User finds price history showing old record from April:
- CosPri: 100, SlsPri: 140 (from April)
- Realizes it was wrong, should have been 145

User clicks "Edit this price" → selectedPriceHistoryId=123

Result:
✓ itemmaster updated (SlsPri=145)
✓ Only that specific item_price_det record updated
✓ All other history records unchanged
```

---

## Discount Tier System

Used for quantity-based discounts in sales:

| Tier | Qty Threshold | Discount % |
|------|---------------|-----------:|
| 1    | RtQty1        | RtDis1 %   |
| 2    | RtQty2        | RtDis2 %   |
| 3    | RtQty3        | RtDis3 %   |
| 4    | RtQty4        | RtDis4 %   |

Example:
```
RtQty1=10, RtDis1=5     → Buy 10+ units = 5% discount
RtQty2=20, RtDis2=10    → Buy 20+ units = 10% discount
RtQty3=50, RtDis3=15    → Buy 50+ units = 15% discount
RtQty4=100, RtDis4=20   → Buy 100+ units = 20% discount
```

These are stored in:
- `itemmaster` (current tiers)
- `item_price_det` (historical tiers)
- `purchase_det` (if batch_no provided)

---

## Important Notes

1. **Multiple Prices**: A product can have 4 different price points (Cost, Retail, Wholesale, Extra) for different sales channels
2. **Price History**: All price changes are audited in `item_price_det` with timestamps
3. **Batch Linking**: Products can link to specific purchase batches for batch-specific pricing
4. **Discount Tiers**: Support quantity-based discounts (buy more, pay less)
5. **Validation**: All prices are validated as numeric, optional fields can be null
6. **Company Scoping**: Prices are stored with company_code and section_code for multi-tenant support

