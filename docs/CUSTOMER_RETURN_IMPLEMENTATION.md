# Customer Return System - Implementation Guide

## Overview

The Customer Return System handles returns of items and printers from customers. It supports:
- Regular item returns
- Printer returns (with serial numbers)
- Damage assessment (good, damaged, defective)
- Multiple refund methods (cash, exchange, store credit, partial)
- Stock management for returned items
- Complete audit trail

## Database Tables

### customer_returns
Main table storing return header information:
- `return_no`: Auto-generated unique return number
- `return_date`: Date of the return
- `customer_id`, `customer_code`, `customer_name`: Customer details
- `sales_transaction_id`, `original_invoice_no`: Link to original sale (optional)
- `return_type`: item | printer | mixed
- `total_return_amount`: Total value of returned items
- `return_value`: Amount used for refund/exchange calculations (initially same as total_return_amount)
- `refund_amount`: Amount refunded in cash
- `exchange_amount`: Value for exchange
- `refund_method`: cash | exchange | credit | partial
- `status`: pending | processed | completed | cancelled
- `reason`: Reason for return
- `notes`: Additional notes

### customer_return_items
Stores individual returned items:
- `item_code`, `item_ky`, `item_name`: Item identification
- `quantity`, `unit_price`: Quantity and pricing
- `serial_number`: For printers/serialized items
- `batch_no`: Batch tracking
- `brand`, `model`, `warranty`: Product details
- `item_type`: item | printer
- `condition`: good | damaged | defective
- `damage_notes`: Description of damage
- `add_to_stock`: Boolean - whether to add back to inventory

## Key Features

### 1. Item Entry
- **Items**: Search by code, name, or barcode
  - Displays current stock levels
  - Auto-fills pricing from item master
  - Supports batch tracking
  
- **Printers**: Search by serial number, brand, or model
  - Retrieves printer from purchase details
  - Includes warranty information
  - Validates serial number uniqueness

### 2. Condition Assessment
- **Good**: Item is in sellable condition → Added back to stock
- **Damaged**: Item has damage → NOT added to stock
- **Defective**: Item is defective → NOT added to stock

Damaged/defective items require damage notes but are still tracked in the return.

### 3. Refund Processing
- **Cash Refund**: Full refund in cash
- **Exchange**: Customer exchanges for other items (no cash refund)
- **Store Credit**: Amount credited to customer account
- **Partial**: Mix of cash and exchange

### 4. Stock Management
Items marked as "good" condition are automatically added back to stock:
- Regular items → Updated in `stock_in_hand` table
- Printers → Purchase detail stock location updated

**Stock Section Routing:**
- Returns with invoice: Stock is added back to the **original section** where the item was sold from
- Returns without invoice: Stock is added to the **main stock section** (or user's section as fallback)
- This prevents stock from being incorrectly added to the "Import Buying and Selling" section when processed by users from that section

### 5. Invoice Linking (Optional)
Can link to original sales invoice:
- Search by invoice number
- Auto-populate customer details
- Reference original sale items

## Routes

```php
// Main CRUD
GET  /customer-returns              → Index (list all returns)
GET  /customer-returns/create       → Create form
POST /customer-returns              → Store new return
GET  /customer-returns/{id}         → Show return details
GET  /customer-returns/{id}/receipt → PDF receipt

// Search endpoints
GET /customer-returns/search-customers  → Search customers
GET /customer-returns/search-items      → Search regular items
GET /customer-returns/search-printers   → Search printers
GET /customer-returns/search-invoice    → Get sale by invoice number

*Returned items created via an invoice are always posted to the import‑buying*
*section (`VIS-SEC-002`) regardless of the original sale location. This ensures
stock hits the correct batch.*
```

## Permissions

Uses existing sales permissions:
- `sales.view` - View customer returns
- `sales.create` - Create new returns
- `sales.edit` - Edit returns (if implemented)

## Sidebar Navigation

Located in **Payments** section:
- Visible to: `company_admin`, `cashier`
- Icon: Undo2 (return icon)

## Workflow

### Creating a Return

1. **Navigate**: Sidebar → Payments → Customer Returns → New Return

2. **Enter Return Information**:
   - Return date
   - Customer name (required)
   - Original invoice number (optional)
   - Refund method
   - Reason/notes

3. **Add Items**:
   - Switch between Item/Printer mode
   - Search for product
   - Select from results
   - Set quantity and condition
   - Add damage notes if needed
   - Add to return list

4. **Review Summary**:
   - Total items
   - Good vs damaged count
   - Total refund amount
   - Refund breakdown (if partial)

5. **Process Return**:
   - Submit form
   - System creates return record
   - Updates stock for good items
   - Generates return number
   - Redirects to receipt

### Viewing Returns

- Filter by status, type, date range
- Search by return number, customer, or invoice
- Click to view full details
- Print PDF receipt

## Stock Impact

### Section Routing Logic
The system intelligently routes returned stock to the correct section:

1. **If item has original_sale_item_id** (returned from invoice):
   - Stock is added back to the section where it was originally sold
   
2. **If linked to sales transaction** (has invoice number):
   - Stock is added to the transaction's section

3. **Walk-in returns** (no invoice):
   - Stock is added to the main stock section
   - Falls back to user's section if no main stock exists

This prevents stock from accumulating in the wrong section (e.g., "Import Buying and Selling").

### Regular Items (Good Condition)
```php
// $sectionCode is determined by the routing logic above
StockInHand::where('ItemKy', $itemKy)
    ->where('section_code', $sectionCode)
    ->where('batch_no', $batchNo)
    ->increment('Qty', $quantity);
```

### Printers (Good Condition)
```php
// Finds printer by serial number (regardless of current section)
// Then updates location to the target section
PurchaseDet::where('serial_number', $serialNumber)
    ->where('company_code', $companyCode)
    ->update([
        'stock_location_type' => 'section',
        'stock_location_code' => $sectionCode
    ]);
```

### Damaged/Defective Items
- NOT added to stock
- Tracked in return record
- Damage notes stored for reference

## PDF Receipt

Template: `resources/views/pdf/customer-return-receipt.blade.php`

Includes:
- Company header
- Return details
- Customer information
- Itemized list with conditions
- Damage notes
- Refund summary
- Stock impact summary
- Processing information

## Models

### CustomerReturn
```php
// Relationships
customer()           → Customer
salesTransaction()   → SalesTransaction
processedBy()       → User
items()             → CustomerReturnItem[]
section()           → Section
company()           → Company

// Methods
// generateReturnNo now returns a compact identifier and is safe under
// concurrent requests.  Format: "R-{section}-{seq}" (e.g. `R-SEC1-0001`)
// the implementation uses a FOR UPDATE lock so two users cannot receive
// the same number.
generateReturnNo($sectionCode) → string
```

### CustomerReturnItem
```php
// Relationships
customerReturn()     → CustomerReturn
originalSaleItem()  → SalesTransactionItem
itemMaster()        → ItemMaster
```

## Controller Methods

### CustomerReturnController

- `index()` - List all returns with filters
- `create()` - Show create form
- `store()` - Process new return
- `show()` - View return details
- `searchCustomers()` - AJAX customer search
- `searchItems()` - AJAX item search
- `searchPrinters()` - AJAX printer search
- `getSalesByInvoice()` - Get sale by invoice (now searches across sections within the same company; previous version incorrectly required the sale to belong to the user's section)
- `generateReceipt()` - PDF receipt

## Frontend Components

### Index (CustomerReturns/Index.tsx)
- Filterable table
- Status badges
- Date range filters
- Pagination

### Create (CustomerReturns/Create.tsx)
- Two-column layout
- Item/Printer mode toggle
- Search functionality
- Real-time total calculation
- Stock validation
- Damage note entry

### Show (CustomerReturns/Show.tsx)
- Return details
- Item list with conditions
- Refund summary
- Stock impact display
- Print receipt button

## Testing

Run migrations:
```bash
php artisan migrate
```

Create test return:
```bash
php artisan tinker
>>> $return = CustomerReturn::factory()->create();
```

## Future Enhancements

1. ~~Return approval workflow~~ (if needed)
2. ~~Email notifications~~ (if needed)
3. ~~Return analytics/reports~~ (can be added later)
4. ~~Batch returns processing~~ (if needed)
5. ~~Integration with accounting~~ (if needed)
6. ~~Customer return history~~ (already in show page)
7. ~~Damaged item tracking/disposal~~ (can be enhanced)

## Security Considerations

1. **Company Isolation**: Returns filtered by company_code
2. **Permission Checks**: All routes check user permissions
3. **Data Validation**: Comprehensive validation on store()
4. **Transaction Safety**: Database transactions for data integrity
5. **Audit Trail**: Tracks who processed the return and when

## Common Issues & Solutions

### Issue: Item not found in search
**Solution**: Ensure item exists in ItemMaster with correct section_code and company_code

### Issue: Printer serial number not found
**Solution**: Verify serial number exists in purchase_det table with matching section

### Issue: Stock not updating
**Solution**: Check item condition is "good" and add_to_stock is true

### Issue: Invoice linking fails
**Solution**: Ensure invoice number exact match and belongs to same section

## Support

For issues or questions:
1. Check error logs: `storage/logs/laravel.log`
2. Verify database migrations ran successfully
3. Check user permissions
4. Review stock_in_hand table for updates
