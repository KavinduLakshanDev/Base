# Customer Return - Quick Reference (Sinhala/English)

## මොකද වුනේ (What Changed)

### 1. Stock එකට Add කරනවා (Adding to Stock)
Customer Return Details එකේ Return Items වලට "Added to stock" click කරලා තියෙනවා නම්:

#### Items (සාමාන්‍ය භාණ්ඩ):
- ✅ Import buying and selling section (VIS-SEC-002) එකට add වෙනවා
- ✅ `stock_in_hand` table එකේ CUSTOMER_RETURN entry එකක් create වෙනවා
- ✅ Quantity එක තියන section එකේ වැඩි වෙනවා

#### Printers (Serial Numbers සහිත):
- ✅ Printer එක correct section එකට යනවා (VIS-SEC-002)
- ✅ `purchase_det` table එකේ section code update වෙනවා
- ✅ Printer stock එකේ available වෙනවා

### 2. Stock Transfer එක (Ethakota Ayeth)
Return කරන section එක original sale section එකට වඩා වෙනස් නම්:

- ✅ `stock_transfers` table එකේ record එකක් create වෙනවා
- ✅ Original section එකෙන් return section එකට transfer එකක් record වෙනවා
- ✅ Transfer number: `RET-{return_no}`

**උදාහරණය:**
- Item විකුණුනේ: VIS-SEC-001 එකෙන්
- Return වෙනවා: VIS-SEC-002 එකට
- Result: Stock transfer VIS-SEC-001 → VIS-SEC-002

### 3. Stock Bin Card
Stock bin card එකේ customer returns තියෙනවා automatically:

- ✅ Transaction Type: CUSTOMER_RETURN
- ✅ Correct section එකේ පෙන්නන්නේ
- ✅ Date සහ reference number එක්ක track වෙනවා
- ✅ Reports වල පේනවා

### 4. Stock In Hand Report
Stock in hand report එකේ returns correctly පෙන්නනවා:

- ✅ Return කරපු items stock එකේ count වෙනවා
- ✅ Correct section එකේ පෙන්නනවා
- ✅ Quantity වැඩි වෙනවා
- ✅ Date filter කරලා හරියට පෙන්නන්නේ

### 5. Customer හට Cash Refund (වාපසි මුදල්)
Cash refund එකක් තියෙනවා නම්:

- ✅ `customer_payments` table එකේ negative payment එකක් create වෙනවා
- ✅ Customer account එකේ පෙන්නනවා (money paid TO customer)
- ✅ Method: cash_refund
- ✅ Customer balance එක හරියට update වෙනවා

**කොහොමද පෙන්නනේ:**
```
Customer Account:
- Sales: +100,000 (customer owes)
- Payments: -50,000 (customer paid)
- Cash Refund: -55,000 (we paid customer)
- Balance: -5,000 (we owe customer 5,000)
```

## මේවට බලන්න කොහෙද (Where to Check)

### Stock In Hand Report
**Path:** Reports → Stock In Hand → Select section → View
- Return කරපු items එන්නේ මෙතන
- Section filter කරලා බලන්න (VIS-SEC-002)
- Date range එක select කරන්න

### Stock Transfer Report
**Path:** Stock Transfer → Index
- Filter by transfer number: "RET-"
- Return transfers පේනවා මෙතන
- From/To sections පෙන්නනවා

### Stock Bin Card (Printers)
**Path:** Reports → Printer Stock Bin Card
- Serial number එකෙන් filter කරන්න
- Section හරියටම පෙන්නනවා
- Movement history පේනවා

### Customer Payments
**Path:** Customer → View → Payments
- Cash refunds negative amount එකක් විදිහට පේනවා
- Method: cash_refund
- Reference: Return number

## Database Tables Updated

### 1. stock_in_hand
```
TrnTyp = 'CUSTOMER_RETURN'
Qty = positive (adding stock)
section_code = VIS-SEC-002 (or correct section)
RefNo = Return number
```

### 2. stock_transfers
```
transfer_number = RET-{return_no}
from_section_code = original section
to_section_code = return section
```

### 3. customer_payments
```
amount = negative (refund to customer)
method = 'cash_refund'
reference = return_no
```

### 4. purchase_det (printers only)
```
section_code = updated to return section
stock_location_type = 'printing_section'
```

## Important Notes (වැදගත්)

1. **No Data Loss**: පරණ data කිසිම එකක් delete වෙලා නෑ ✓
2. **Automatic**: Return create කරද්දී automatically හැමදෙයක් වෙනවා ✓
3. **Tracking**: හැම එකක්ම properly track වෙනවා ✓
4. **Reports**: සියලුම reports හරියටම update වෙනවා ✓

## Testing කරන්න කොහොමද

1. Customer Return එකක් create කරන්න
2. Items add කරන්න (good condition)
3. "Add to stock" enable කරන්න
4. Cash refund select කරන්න if needed
5. Submit කරන්න

**Then Check:**
- ✓ Stock In Hand Report → Item එක section එකේ තියෙනවද
- ✓ Stock Transfer → Transfer record එකක් create වෙලා තියෙනවද
- ✓ Customer Payments → Refund එක negative payment එකක් විදිහට තියෙනවද
- ✓ Stock counts හරි වෙනවද

## මොනාද වෙන්නේ Flow එක

```
Customer Return
    ↓
1. Return Item Details Enter (item/printer, quantity, condition)
    ↓
2. Click "Add to Stock" → Condition = Good
    ↓
3. System Creates:
    - stock_in_hand entry (CUSTOMER_RETURN)
    - stock_transfer record (if section changed)
    - customer_payment (if cash refund)
    ↓
4. Reports Automatically Update:
    - Stock In Hand Report ✓
    - Stock Bin Card ✓
    - Stock Transfer ✓
    - Customer Account ✓
```

## Support

Any issues, check logs:
```bash
tail -f storage/logs/laravel.log
```

Look for:
- "Item returned to stock"
- "Printer returned to stock"  
- "Customer refund payment created"
- Any error messages
