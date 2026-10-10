# Customer Return System - Quick Start Guide

## 🎯 What Was Created

A complete customer return system for handling both **regular items** and **printers** that customers return after purchase.

## ✨ Key Features

### 1. **Dual Entry System**
- **Items Mode**: Return regular products (searched by code, name, barcode)
- **Printers Mode**: Return serialized items (searched by serial number, brand, model)

### 2. **Damage Assessment**
- ✅ **Good**: Returns to stock automatically
- ❌ **Damaged**: Tracked but NOT added to stock
- ❌ **Defective**: Tracked but NOT added to stock

### 3. **Flexible Refund Options**
- 💵 **Cash Refund**: Full cash back
- 🔄 **Exchange**: Customer gets different items
- 💳 **Store Credit**: Credit to customer account
- 🔀 **Partial**: Mix of cash + exchange

### 4. **Smart Stock Management**
- Good items automatically added back to stock
- Damaged items tracked but kept out of inventory
- Separate handling for items vs printers
- Batch/serial number tracking

## 📂 Files Created

### Database (2 files)
```
database/migrations/
├── 2026_02_24_100000_create_customer_returns_table.php
└── 2026_02_24_100001_create_customer_return_items_table.php
```

### Models (2 files)
```
app/Models/
├── CustomerReturn.php
└── CustomerReturnItem.php
```

### Controller (1 file)
```
app/Http/Controllers/
└── CustomerReturnController.php
```

### Frontend Pages (3 files)
```
resources/js/pages/CustomerReturns/
├── Index.tsx    → List all returns with filters
├── Create.tsx   → Return entry form
└── Show.tsx     → View return details
```

### PDF Template (1 file)
```
resources/views/pdf/
└── customer-return-receipt.blade.php
```

### Documentation (1 file)
```
CUSTOMER_RETURN_IMPLEMENTATION.md
```

## 🚀 How to Use

### Creating a Return

1. **Navigate**: 
   - Click **Payments** in sidebar → **Customer Returns** → **New Return**

2. **Fill Basic Info**:
   - Return date
   - Customer name *
   - Original invoice (optional - auto-fills customer)
   - Refund method (cash/exchange/credit/partial)
   - Reason for return

3. **Add Items**:
   - Toggle **Items** or **Printers** mode
   - Search for product
   - Select from results
   - Enter quantity
   - Choose condition (good/damaged/defective)
   - Add damage notes if needed
   - Click "Add to Return List"

4. **Review & Submit**:
   - Check summary panel
   - See good vs damaged count
   - Verify refund amount
   - Click "Process Return"

5. **Done!**:
   - System generates return number
   - Updates stock for good items
   - Shows receipt
   - Can print PDF

### Viewing Returns

- **Filter** by status, type, date range
- **Search** by return number, customer, or invoice
- **Click** any return to see full details
- **Print** PDF receipt anytime

## 🔑 Access Control

**Who can use it:**
- `company_admin` - Full access
- `cashier` - Full access

**Location in sidebar:**
- Section: **Payments**
- Icon: Return/Undo icon
- Position: After "Customer Payments"

## 🗄️ Database Schema

### customer_returns
Main table with return header:
- Return number, date, customer
- Return type (item/printer/mixed)
- Refund method and amounts (including computed `return_value` used for refunds/exchanges)
- Status tracking
- Original invoice reference

### customer_return_items
Individual items returned:
- Item details (code, name, price)
- Serial number (for printers)
- Batch number
- Condition assessment
- Damage notes
- Stock addition flag

## 🔄 Stock Impact

### Regular Items (Good)
```php
stock_in_hand → Qty increased
```

### Printers (Good)
```php
purchase_det → stock_location updated
```

### Damaged/Defective
```
NOT added to stock
Tracked in return_items table
Damage notes recorded
```

## 📊 What You Can Track

- Total returns per day/month
- Damaged vs good items
- Refund amounts
- Customer return patterns
- Stock adjustments
- Printer returns by serial number

## 🛣️ Routes Added

```php
GET  /customer-returns                          → List
GET  /customer-returns/create                   → Create form
POST /customer-returns                          → Save
GET  /customer-returns/{id}                     → Details
GET  /customer-returns/{id}/receipt             → PDF

GET  /customer-returns/search-customers         → AJAX
GET  /customer-returns/search-items             → AJAX
GET  /customer-returns/search-printers          → AJAX
GET  /customer-returns/search-invoice           → AJAX (matches invoice number across company; suffixes such as ":1" are ignored)
```

## 📝 Return Number Format

```
RET-{SECTION}-{DATE}-{SEQUENCE}

Example: RET-MAIN-20260224-0001
```

## ✅ What Happens When You Process a Return

1. ✅ Return record created with unique number
2. ✅ Each item saved with condition assessment
3. ✅ Good items added to stock automatically
4. ✅ Damaged items tracked but not stocked
5. ✅ Refund amount calculated
6. ✅ Status set to "completed"
7. ✅ User and timestamp recorded
8. ✅ Receipt generated

## 🎨 UI Features

### List Page
- Filterable table
- Status badges (color-coded)
- Date range filters
- Search box
- Pagination

### Create Page
- Two-column layout
- Real-time search
- Item/Printer mode toggle
- Live total calculation
- Damage notes textarea
- Summary panel (sticky)

### Show Page
- Complete return details
- Itemized list with conditions
- Refund breakdown
- Stock impact summary
- Print button

## 🔍 Search Capabilities

**Items:**
- By item code
- By item name
- By barcode

**Printers:**
- By serial number
- By brand
- By model

**Returns:**
- By return number
- By customer name
- By original invoice

## 💡 Pro Tips

1. **Link to Invoice**: Enter original invoice number to auto-fill customer and validate items

2. **Batch Processing**: Add multiple items in one return

3. **Partial Refunds**: Use "Partial" method when customer wants some cash + some exchange

4. **Damage Notes**: Always document damage clearly for audit trail

5. **Stock Check**: System won't let you return more than was sold (when invoice linked)

## 🆘 Troubleshooting

**Issue**: Item not found in search
- ✅ Check item exists in your section
- ✅ Verify company_code matches

**Issue**: Printer not found
- ✅ Ensure serial number is exact match
- ✅ Check it was purchased in your section

**Issue**: Stock not updating
- ✅ Verify condition is set to "good"
- ✅ Check add_to_stock is enabled

## 📱 Mobile Friendly

All pages are responsive and work on:
- Desktop
- Tablet
- Mobile phones

## 🎯 Next Steps

1. ✅ System is ready to use
2. ✅ Test with a sample return
3. ✅ Train cashiers on the process
4. ✅ Set return policies
5. ✅ Monitor return trends

## 📖 Full Documentation

See `CUSTOMER_RETURN_IMPLEMENTATION.md` for:
- Complete technical details
- API documentation
- Database schema
- Code examples
- Advanced features

---

**Status**: ✅ Complete and Ready to Use
**Version**: 1.0
**Date**: February 24, 2026
