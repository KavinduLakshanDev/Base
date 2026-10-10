# Sales Create (POS) Component - Comprehensive Overview

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Structures & Interfaces](#data-structures--interfaces)
3. [State Management](#state-management)
4. [Core Workflows & Flows](#core-workflows--flows)
5. [Key Functions & Their Purpose](#key-functions--their-purpose)
6. [UI Components & Subcomponents](#ui-components--subcomponents)
7. [Effects & Lifecycle](#effects--lifecycle)
8. [Data Validation & Error Handling](#data-validation--error-handling)
9. [Price Calculation System](#price-calculation-system)
10. [VAT & Tax Handling](#vat--tax-handling)

---

## 🏗️ Architecture Overview

The **Sales Create** page is a sophisticated **Point of Sale (POS)** system built with:
- **Backend**: Laravel 10 with Inertia.js
- **Frontend**: React with TypeScript  
- **Styling**: Tailwind CSS + Radix/Headless UI
- **State Management**: React hooks (useState, useEffect, useCallback, useRef)
- **Form Handling**: Inertia's `useForm()` hook

### High-Level Flow:
```
User Input → Search/Select Item/Printer → Add to Cart → Calculate Totals → 
Select Customer → Choose Payment → Validate → Submit → Print Receipt → Reset Form
```

---

## 📊 Data Structures & Interfaces

### 1. **SaleItem** (Line Item in Cart)
```typescript
interface SaleItem {
  // Basic Info
  item_code: string;
  item_name: string;
  barcode?: string;
  batch_no?: string | null;
  
  // Pricing (Multiple options)
  unit_price: number;           // Current price being used
  our_price: number;            // Display price
  retail_price: number;         // MRP
  wholesale_price: number;      // Wholesale price
  extra_price: number;          // Extra/special price
  card_price?: number;          // Card payment price
  cost_price: number;           // Cost for margin calculation
  
  // Quantity & Discounts
  quantity: number;
  free_quantity: number;
  discount_amount?: number;     // Item-level discount
  original_discount_amount?: number;  // Saved discount when card price applied
  
  // Inventory
  stock?: number;               // Available stock
  
  // Product Details
  serial_number?: string;       // For printers (makes it a tracked item)
  brand?: string;
  model?: string;
  warranty?: string;
  category?: string;
  unit?: string;
  
  // VAT Handling
  vat_inclusive?: boolean;      // Is price already VAT-inclusive?
  
  // Quantity-Based Discount Tiers
  tier1_qty?: number | null;
  tier1_discount?: number | null;
  tier2_qty?: number | null;
  tier2_discount?: number | null;
  tier3_qty?: number | null;
  tier3_discount?: number | null;
  tier4_qty?: number | null;
  tier4_discount?: number | null;
  
  // Bulk/Free Issue Schemes
  free_issue_scheme_buy_qty?: number;
  free_issue_scheme_get_qty?: number;
  wholesale_min_qty?: number | null;
  
  // Unit Conversion
  sell_unit_type?: 'bundle' | 'nos';
  
  // Supporting
  cus_discount_rate?: number;
  itm_ky?: number;              // Legacy table reference
}
```

### 2. **ItemMaster** (Fetched from Database)
Similar to **SaleItem** but includes:
```typescript
interface ItemMaster {
  // ... all SaleItem fields +
  
  // Unit Conversion
  transfer_conversion_factor?: number;  // e.g., 10 items per bundle
  from_unit_name?: string | null;       // e.g., "Bundle"
  to_unit_name?: string | null;         // e.g., "Nos"
  
  // Split Stock (for bundle/NOS items)
  nos_stock?: number;                   // Stock in number of units
  bundle_stock?: number;                // Stock in bundles
  
  // Tiered Discounts Structure
  tiers?: {
    tier1?: { qty: number | null; discount: number | null };
    tier2?: { qty: number | null; discount: number | null };
    tier3?: { qty: number | null; discount: number | null };
    tier4?: { qty: number | null; discount: number | null };
  };
  
  // Batch Selection
  batches?: ItemMaster[];                // Multiple batches of same item
}
```

### 3. **Customer** Interface
```typescript
interface Customer {
  code: string;
  name: string;
  is_vat_registered?: boolean;
  vat_no?: string;
}
```

### 4. **Form Data Structure** (Main useForm())
```typescript
const formData = {
  // Invoice & Transaction
  invoice_no: string;
  transaction_date: string;
  
  // Customer
  customer_code: string;
  customer_name: string;
  customer_vat_no: string;
  
  // VAT & Pricing
  is_vat_invoice: boolean;
  vat_rate: number;
  price_type: 'retail' | 'wholesale' | 'card';  // Current price mode
  
  // Items
  items: SaleItem[];
  
  // Totals (Auto-calculated)
  subtotal: number;           // Gross total before discounts
  discount_amount: number;    // Manual/bulk discount
  total_discount: number;     // Item + manual discounts
  tax_amount: number;         // VAT calculated
  total_amount: number;       // Final total
  
  // Payment Details
  payment_mode: 'cash' | 'card' | 'cheque' | 'bank_transfer' | 'credit';
  cash_payment: string;
  card_payment: string;
  cheque_payment: string;
  bank_transfer_payment: string;
  cheque_no: string;
  cheque_bank: string;
  cheque_branch: string;
  cheque_date: string;
  bank_ref: string;
  bank_name: string;
  bank_branch: string;
  bank_account_id: string;
  balance_amount: string;     // Change/remaining
}
```

---

## 🎛️ State Management

### Main Form State (Inertia useForm)
**Purpose**: Primary data container for the entire invoice
```typescript
const { data, setData, post, processing, errors } = useForm({
  // See Form Data Structure above
});
```

### Component-Level State

#### 1. **Item Entry State**
```typescript
itemInput: {code, name, price, quantity, barcode, serial_number}
selectedItem: ItemMaster | null              // Currently selected item
batchInput: string                           // Batch number input
isBatchModalOpen: boolean                    // Batch selection modal
batchCandidates: ItemMaster[]               // Items with multiple batches
```

#### 2. **Customer State**
```typescript
selectedCustomer: Customer | null
customerSearch: string
customers: Customer[]
isCustomerDialogOpen: boolean
isCustomerCreateDialogOpen: boolean
isPrivilegeModalOpen: boolean               // Privilege/regular customer selection
```

#### 3. **Item Search State**
```typescript
itemSearch: string
items: ItemMaster[]                         // Search results
isItemDialogOpen: boolean
isDropdownOpen: boolean
```

#### 4. **Printer Entry State**
```typescript
entryMode: 'item' | 'printer'               // Toggle between item/printer mode
printerSearch: string
printers: any[]
isPrinterDialogOpen: boolean
```

#### 5. **Payment & Validation State**
```typescript
editingQuantity: {index, quantity} | null   // Inline quantity editor
editingDiscount: {index, discount} | null   // Inline discount editor
showCardPriceConfirmation: boolean          // Confirm card price override
prevManualDiscount: number | null           // Saved discount for card mode
```

#### 6. **UI State**
```typescript
isFullscreen: boolean
isMobilePreviewOpen: boolean
isUnitSelectionOpen: boolean                // Bundle vs NOS selection
unitSelectionPendingItem: ItemMaster | null
unitSelectionFocus: 'bundle' | 'nos'        // Keyboard navigation
```

#### 7. **VAT & Company Info**
```typescript
vat_Breakdown: {
  vatable_subtotal: number;                 // Base for VAT calculation
  vat_to_add: number;                       // VAT on exclusive items
  vat_inclusive_subtotal: number;           // Price of inclusive items
  vat_extracted: number;                    // VAT extracted from inclusive
  vat_rate: number;
}
companyVatInfo: {vat_rate, vat_no}
companyInfo: {name, address, phone, vat_no}
allVatRates: any[]                          // Available VAT rates by date
dayBalance: {opening_balance, today_cash_sales, current_balance}
```

#### 8. **Customer Creation State**
```typescript
customerForm: {name, phone, email, is_vat_registered, vat_no}
customerFormErrors: {[key]: string}
isCreatingCustomer: boolean
autoPrintEnabled: boolean
```

#### 9. **Abort Controllers** (Search Cancellation)
```typescript
searchItemsAbortRef: AbortController | null     // Cancel pending item searches
searchPrintersAbortRef: AbortController | null  // Cancel pending printer searches
```

---

## 🔄 Core Workflows & Flows

### 1. **Item Addition Workflow**

```
┌─────────────────────────────────────────────────────────────────┐
│ User enters Item Code                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ searchItems(query)            │
        │ - Calls: /sales/search/items │
        │ - Sets: items, isDropdownOpen│
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ selectItem(item)              │
        │ OR handleBatchSelect()        │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
    Has Unit Conversion?      No Conversion
        │                             │
        │ YES                         ▼
        │                    setSelectedItem()
        │                    setItemInput(price, code, name, etc)
        │                             │
        ▼                             │
    ┌──────────────────────┐         │
    │ Show Unit Selection  │         │
    │ Modal (Bundle/NOS)   │         │
    └──────────┬───────────┘         │
               │                     │
               ▼                     │
    ┌──────────────────────┐         │
    │ confirmUnitSelection()│         │
    │ - Modify prices      │         │
    │ - Adjust stock       │         │
    │ - Set sell_unit_type │         │
    └──────────┬───────────┘         │
               │                     │
               ├─────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Is Printer Item?     │
    │ (has serial_number)  │
    └──────────┬───────────┘
               │
        ┌──────┴──────┐
        │             │
        YES           NO
        │             │
        ▼             ▼
    Auto-Add to    Wait for User
    Cart           to Input Qty
    │              │
    └──────┬───────┘
           │
           ▼
    ┌─────────────────────┐
    │ addItem() / addPrinter()
    │ - Check stock
    │ - Check duplicates
    │ - Calculate discount tiers
    │ - Calculate free quantity
    │ - Add to items array
    └─────────────────────┘
```

### 2. **Price Management Workflow**

```
┌──────────────────────────────────────────┐
│ Price Type Changes (Retail/Wholesale/Card)
└──────────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │ getCurrentPrice(item)         │
    │ - Check price_type setting   │
    │ - Check vat_inclusive        │
    │ - Return appropriate price   │
    └──────────┬───────────────────┘
               │
               ├─ Retail? → item.retail_price
               ├─ Wholesale? → item.wholesale_price
               ├─ Card? → item.card_price || retail
               └─ VAT Inclusive? → item.retail_price (fixed)
```

**Key Points**:
- **For currently being entered item**: Price updates immediately
- **For items in cart**: Prices stay fixed (don't auto-update)
- **Exception**: Printers update when payment mode changes
- **Card Mode Special**: Stores original_discount_amount for restoration

### 3. **Payment Mode Switch Workflow**

```
User Selects Payment Mode (Cash → Card / Card → Cash)
           │
           ▼
Cash to Card:
├─ Check if items in cart
├─ Show confirmation dialog
├─ User confirms → applyCardPrices()
│  ├─ Update all items to card_price
│  ├─ Clear item-level discounts (save to original_discount_amount)
│  ├─ Clear manual discount (save to prevManualDiscount)
│  └─ Set payment_mode = 'card'
└─ Recalculate totals

Card to Cash/Other:
├─ Revert items to retail price
├─ Restore saved discounts (from original_discount_amount)
├─ Restore manual discount (from prevManualDiscount)
└─ Recalculate totals
```

### 4. **VAT Calculation & Invoice Workflow**

```
┌─────────────────────────────────────────┐
│ Form Data Changes                       │
│ (items, discounts, is_vat_invoice, date)│
└─────────────┬───────────────────────────┘
              │
              ▼
    ┌──────────────────────────┐
    │ Trigger calculateTotals()│
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ Categorize Items:            │
    │ - VAT Exclusive (old style)  │
    │ - VAT Inclusive (MRP pricing)│
    └──────────┬───────────────────┘
               │
               ├─ VAT Exclusive Items:
               │  └─ Net = price - item_discount
               │  └─ VAT = Net × rate% (ADDED to total)
               │
               └─ VAT Inclusive Items:
                  └─ Net = price - item_discount
                  └─ VAT = Net - (Net / (1 + rate%)) (EXTRACTED for display)
               │
               ▼
    ┌──────────────────────────────┐
    │ Calculate:                   │
    │ - Subtotal (gross)           │
    │ - Total Discounts            │
    │ - VAT Breakdowns             │
    │ - Final Total                │
    │ - Balance/Change             │
    └──────────────────────────────┘
```

**VAT Logic**:
- **is_vat_invoice = false**: No VAT calculation
- **is_vat_invoice = true**: 
  - VAT-exclusive items get VAT ADDED
  - VAT-inclusive items have VAT EXTRACTED
  - Both types can be on same invoice

### 5. **Form Submission Workflow**

```
┌──────────────────────────────────┐
│ User Clicks Save Button           │
└────────────┬─────────────────────┘
             │
             ▼
    ┌─────────────────────────────┐
    │ handleSave()                │
    │ - Validate business rules   │
    └────────────┬────────────────┘
                 │
                 ├─ Printer sales require customer? YES
                 ├─ Cheque payment requires customer? YES
                 ├─ All items have valid qty/stock? YES
                 │
                 ▼
    ┌─────────────────────────────┐
    │ POST to /sales              │
    │ - Convert is_vat_invoice    │
    │   boolean to 1/0            │
    │ - Send all form data        │
    └────────────┬────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        SUCCESS            ERROR
        │                  │
        ▼                  ▼
    Receipt Print    Toast Error
    │                  │
    ▼                  ▼
    Reset Form    Show Validation
    │             Errors
    ▼
    Focus Item Code
    Ready for Next
```

---

## 🔧 Key Functions & Their Purpose

### **Item Search & Selection**

#### `searchItems(query: string)`
- **Purpose**: Find items by code or name
- **API**: `GET /sales/search/items?query={query}`
- **Updates**: `items` state with search results
- **Features**: 
  - Aborts previous searches to prevent race conditions
  - 10-second timeout
  - Error handling

#### `handleBatchSelect(item: ItemMaster)` / `selectItem(item: ItemMaster)`
- **Purpose**: Select an item and prepare it for addition
- **Logic**:
  - Check for unit conversion (Bundle vs NOS)
  - If conversion needed: show modal, await user choice
  - If printer: auto-add to cart
  - If stationary: wait for quantity input
- **Updates**: `selectedItem`, `itemInput`, `items` (clear), `isItemDialogOpen`

#### `confirmUnitSelection(unitType: 'bundle' | 'nos')`
- **Purpose**: Confirm bundle or NOS unit selection
- **Logic**:
  - Adjust prices by conversion factor
  - Select appropriate stock (bundle_stock vs nos_stock)
  - For printers: auto-add to cart
  - For stationary: set selectedItem and show form
- **Updates**: `selectedItem`, `itemInput`, `data.items`, `isUnitSelectionOpen`

### **Item Addition to Cart**

#### `addItem()`
- **Purpose**: Add stationary item to sales items list
- **Validations**:
  - Item code and quantity must be provided
  - Stock must be > 0 and sufficient
  - No duplicates with same code + batch_no
- **Logic**:
  - Check for quantity-based discounts (tier1-4)
  - Calculate free quantity (from buy-get schemes)
  - Auto-apply wholesale if qty threshold met
  - If duplicate: increment quantity
  - If new: append to items array
- **Triggers**: `calculateTotals()` via useEffect

#### `addPrinter(printer: any)`
- **Purpose**: Add tracked/serial-numbered printer to cart
- **Special Logic**:
  - Customer discount rate applied
  - Check for unit conversion same as items
  - No duplicate check (each printer is unique by serial)
- **Triggers**: `calculateTotals()` via useEffect

### **Price Calculation**

#### `getCurrentPrice(item: any): number`
- **Purpose**: Determine current price for an item based on settings
- **Logic**:
  ```
  IF price_type === 'retail' → return retail_price
  IF price_type === 'wholesale' → return wholesale_price || retail_price
  IF price_type === 'card' → return card_price || retail_price
  IF vat_inclusive → return retail_price (MRP, always fixed)
  DEFAULT → return retail_price
  ```
- **Used in**: Item selection, price updates, display

#### `calculateTotals()`
- **Purpose**: Calculate all totals (subtotal, tax, final total)
- **Steps**:
  1. Iterate items: sum gross total, discounts, VAT bases
  2. Separate VAT-exclusive vs VAT-inclusive items
  3. Calculate VAT:
     - Exclusive: VAT = net × rate%
     - Inclusive: VAT = net - (net / (1 + rate%))
  4. Calculate final total
  5. Calculate balance/change
  6. Update VAT breakdown state
  7. Update form data with calculated values
- **Triggered By**: Items change, payment mode change, is_vat_invoice change

### **Customer Management**

#### `handlePrivilegeCustomerSelect(customer: any)`
- **Purpose**: Select a privilege/registered customer
- **Logic**:
  - Set customer code, name, price_type
  - Fetch customer details from DB
  - Close privilege modal
- **Updates**: `data` (customer fields), `selectedCustomer`, `isPrivilegeModalOpen`

#### `fetchCustomerByCode(code: string)`
- **Purpose**: Fetch detailed customer info from local database
- **API**: `GET /sales/search/customers?query={code}&type=customer`
- **Updates**: Full customer record in form data

#### `createCustomer()`
- **Purpose**: Create new customer on-the-fly
- **API**: `POST /website/customer` (or similar endpoint)
- **Validation**: Check backend errors and map to form
- **Updates**: New customer added to system and selected in form

### **Payment Processing**

#### `handlePaymentModeChange(newMode: string)`
- **Purpose**: Switch payment method
- **Logic**:
  - If switching to CARD from others:
    - Show confirmation dialog
    - If confirm: apply card prices
  - If switching away from CARD:
    - Revert to retail prices
    - Restore original discounts
    - Restore manual discount

#### `applyCardPrices()`
- **Purpose**: Apply card-specific pricing when switching to card payment
- **Logic**:
  - Save current manual discount to `prevManualDiscount`
  - Update all items:
    - Set unit_price = card_price || retail_price
    - Save item-level discount to `original_discount_amount`
    - Clear item-level discount
  - Clear manual discount
  - Set payment_mode = 'card'

### **Quantity & Discount Editing**

#### `updateQuantity(index: number, newQuantity: number)`
- **Purpose**: Update item quantity with auto-discount/free-qty logic
- **Validations**: 
  - Qty > 0
  - Qty <= available stock
- **Auto-Logic**:
  - Check quantity-based tiers (tier1-4)
  - Apply highest matching tier discount
  - Calculate free quantity from schemes
  - Auto-apply wholesale if threshold met
- **Recalculates**: Item total, triggers calculateTotals()

#### `updateDiscount(index: number, newDiscount: number)`
- **Purpose**: Manually edit item-level discount
- **Validations**: Discount >= 0, Discount <= item total
- **Updates**: Item total, triggers calculateTotals()

### **Form Submission**

#### `handleSave(e: React.FormEvent)`
- **Purpose**: Complete transaction and save invoice
- **Pre-Submission Validations**:
  - Printer sales require registered customer?
  - Cheque payments require registered customer?
  - All items valid?
- **Submission**:
  - Convert `is_vat_invoice` boolean to 1/0 for backend
  - POST to `/sales` with all form data
  - Abort any pending searches
- **On Success**:
  - Show success toast notification
  - Auto-print receipt (if enabled)
  - Fetch next invoice number
  - Reset all form state
  - Focus back to item code field
- **On Error**:
  - Show validation error toast
  - Display specific field errors
  - Keep form state for corrections

#### `printReceipt(saleData?: any)`
- **Purpose**: Generate and print receipt for transaction
- **API**: `POST /sales/preview-receipt`
- **Response**: Blob PDF
- **UI**: 
  - Opens hidden iframe
  - Triggers browser print dialog
  - Cleans up after printing

---

## 🎨 UI Components & Subcomponents

### Main Layout Structure:
```
<AppLayout>
  ├─ Background Effects (Gradient blur circles)
  └─ Form Container (bg-white/80, backdrop blur)
      ├─ EntryModeToggle (Item vs Printer toggle)
      ├─ SaleInformationForm (Date, Customer, VAT mode)
      ├─ ItemEntryForm (Item code, quantity, price input)
      ├─ PrinterEntryForm (Printer barcode/serial search)
      ├─ ItemsListTable (Display added items)
      ├─ PrintersListTable (Display added printers)
      ├─ PaymentTotalsSection (Totals, payment method, payment amounts)
      ├─ QuickReceiptPreview (Mobile/fullscreen preview)
      │
      └─ Modals:
          ├─ ItemNameListModal (Search results dropdown)
          ├─ BatchSelectionModal (Batch selection for multi-batch items)
          ├─ UnitSelectionModal (Bundle vs NOS choice)
          ├─ PrivilegeAccessModal (Registered customer selection)
          ├─ CustomerSearchDialog (Search/select customers)
          ├─ CustomerCreateDialog (Create new customer on-the-fly)
          ├─ CardPriceConfirmationDialog (Confirm card price override)
          └─ PrinterSearchDialog (Search printers)
```

### Component Import Tree:
```typescript
// UI Components from Radix
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Icons
import { Plus, RefreshCcw, CreditCard, Wallet, TrendingUp, Banknote } from 'lucide-react';

// Custom Components
import PrivilegeAccessModal from './components/PrivilegeAccessModal';
import BatchSelectionModal from './components/BatchSelectionModal';
import SaleInformationForm from './components/SaleInformationForm';
import EntryModeToggle from './components/EntryModeToggle';
import ItemEntryForm from './components/ItemEntryForm';
import PrinterEntryForm from './components/PrinterEntryForm';
import ItemsListTable from './components/ItemsListTable';
import PrintersListTable from './components/PrintersListTable';
import PaymentTotalsSection from './components/PaymentTotalsSection';
import ItemNameListModal from './components/ItemNameListModal';

// Third-party
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import axios from 'axios';
```

### Sub-component Responsibilities:

| Component | Purpose |
|-----------|---------|
| **EntryModeToggle** | Switch between Item and Printer entry modes |
| **SaleInformationForm** | Date, Customer, VAT invoice toggle, price type selection |
| **ItemEntryForm** | Item code input, search, quantity, barcode, serial number entry |
| **PrinterEntryForm** | Printer search by serial/model, barcode entry |
| **ItemsListTable** | Display items with inline edit for qty/discount, remove button |
| **PrintersListTable** | Display printers with inline edit, remove button |
| **PaymentTotalsSection** | Display: subtotal, discounts, VAT, total; payment mode; payment amounts; balance |
| **ItemNameListModal** | Dropdown showing search results for item selection |
| **BatchSelectionModal** | Modal for selecting batch when item has multiple batches |
| **PrivilegeAccessModal** | Modal for selecting registered/privilege customer |
| **CustomerSearchDialog** | Dialog for searching/selecting customers |
| **CustomerCreateDialog** | Dialog for creating new customer |
| **UnitSelectionModal** | Modal for choosing Bundle vs NOS unit |
| **CardPriceConfirmationDialog** | Confirmation message when switching to card prices |
| **PrinterSearchDialog** | Dialog for searching printers |

---

## ⚡ Effects & Lifecycle

### **useEffect Hooks** (In execution order):

#### 1. **Initial Data Fetch** (Lines 459-502)
```typescript
useEffect(() => {
  const fetchInitialData = async () => {
    // Fetch VAT rates from /company/vat-rates
    // Find applicable rate for current date
    // Fetch company info from /api/company-data
    // Set initial VAT rate on form
  };
  fetchInitialData();
}, []);  // Runs once on mount
```
**Purpose**: Load VAT rates and company information

---

#### 2. **VAT Rate Update on Date Change** (Lines 509-530)
```typescript
useEffect(() => {
  if (allVatRates.length > 0 && data.transaction_date) {
    // Find applicable VAT rate for transaction date
    // Update form vat_rate if different
  }
}, [data.transaction_date, allVatRates]);
```
**Purpose**: Update VAT rate when transaction date changes (different rates may apply on different dates)

---

#### 3. **Focus Item Code Field** (Lines 535-537)
```typescript
useEffect(() => {
  if (itemCodeRef.current) {
    itemCodeRef.current.focus();
  }
}, []);  // Runs once
```
**Purpose**: Auto-focus item code input for quick entry

---

#### 4. **Keyboard Shortcuts** (Lines 618-640)
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    F7/Ctrl+S: Save form
    F10: Reset form (with confirmation)
    F11: Toggle fullscreen
    "+": Focus payment input (based on mode)
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [data.payment_mode, showCardPriceConfirmation, resetForm]);
```
**Purpose**: Keyboard shortcuts for power users

---

#### 5. **Fullscreen State Sync** (Lines 648-649)
```typescript
useEffect(() => {
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
}, []);
```
**Purpose**: Track fullscreen state changes

---

#### 6. **Recalculate Totals** (Line 655)
```typescript
useEffect(() => {
  calculateTotals();
}, [data.items, data.cash_payment, data.card_payment, data.cheque_payment, 
    data.bank_transfer_payment, data.is_vat_invoice, data.vat_rate]);
```
**Purpose**: Whenever items or payment info changes, recalculate totals

---

#### 7. **Update Item Price When Price Type Changes** (Lines 661-666)
```typescript
useEffect(() => {
  if (selectedItem) {
    const price = getCurrentPrice(selectedItem);
    setItemInput(prev => ({ ...prev, price }));
  }
}, [data.price_type, data.payment_mode, selectedItem]);
```
**Purpose**: Update currently-being-entered item's price when price type/payment mode changes

---

#### 8. **Update Printer Prices When Payment Mode Changes** (Lines 673-687)
```typescript
useEffect(() => {
  if (data.items.length > 0) {
    const updatedItems = data.items.map(item => {
      // If printer (serial_number), update price
      if (item.serial_number && item.serial_number.trim() !== '') {
        const newPrice = getCurrentPrice(item);
        return { ...item, unit_price: newPrice, our_price: newPrice, total: ... };
      }
      return item;
    });
    setData('items', updatedItems);
  }
}, [data.price_type, data.payment_mode]);
```
**Purpose**: Update prices for printers in cart when payment mode changes (normal items stay fixed)

---

#### 9. **Clear Forms When Entry Mode Changes** (Lines 716-720)
```typescript
useEffect(() => {
  if (entryMode === 'printer') {
    resetItemInput();  // Clear item input
  } else if (entryMode === 'item') {
    setPrinterSearch('');  // Clear printer input
    setPrinters([]);
  }
}, [entryMode]);
```
**Purpose**: When switching between Item and Printer modes, clear the other input

---

#### 10. **Unit Selection Modal Keyboard Navigation** (Lines 924-948)
```typescript
useEffect(() => {
  if (!isUnitSelectionOpen) return;
  setUnitSelectionFocus('bundle');
  
  // Delayed attachment (50ms) to avoid catching triggering key
  const timer = setTimeout(() => {
    const handleKey = (e: KeyboardEvent) => {
      ArrowLeft/Right: Toggle bundle/nos focus
      Enter: Confirm selection
    };
    window.addEventListener('keydown', handleKey);
  }, 50);
  
  return () => { clearTimeout(timer); cleanup(); };
}, [isUnitSelectionOpen]);
```
**Purpose**: Allow keyboard navigation in unit selection modal

---

## 🛡️ Data Validation & Error Handling

### **Pre-Submission Validations** (In handleSave):

```typescript
// 1. Printer sales validation
if (hasPrinterItems && (!customer_code || customer_code === '0001')) {
  ❌ ERROR: "Customer Required for Printer Sale"
  → Show customer selection dialog
  → Return (don't submit)
}

// 2. Cheque payment validation
if (payment_mode === 'cheque' && (!customer_code || customer_code === '0001')) {
  ❌ ERROR: "Customer Required for Cheque Payment"
  → Show customer selection dialog
  → Return (don't submit)
}

// 3. No duplicate items with same code+batch
if (existingIndex >= 0) {
  → Increment quantity instead of adding duplicate
}

// 4. Stock validation
if (selectedItem.stock <= 0) {
  ❌ "Item is out of stock"
  → Return (don't add)
}

if (itemInput.quantity > selectedItem.stock) {
  ❌ "Requested quantity exceeds available stock"
  → Return (don't add)
}

// 5. Discount validation
if (newDiscount < 0) {
  ❌ "Discount cannot be negative"
  → Return (don't update)
}

if (newDiscount > item.total) {
  ❌ "Discount cannot exceed item total"
  → Return (don't update)
}

// 6. Quantity validation
if (newQuantity <= 0) {
  ❌ "Quantity must be greater than 0"
  → Return (don't update)
}

if (newQuantity > selectedItem.stock) {
  ❌ "Quantity exceeds available stock"
  → Return (don't update)
}
```

### **Backend Error Handling**:

```typescript
try {
  const response = await axios.post('/sales', requestData);
  // Success: reset form, print receipt, etc.
} catch (error) {
  if (error.response?.data?.errors) {
    // Validation errors
    if (error.response.data.errors.customer) {
      → Show customer required error
      → Open customer selection dialog
    } else if (error.response.data.errors.items) {
      → Show "Stock mismatch or invalid data" error
      → Keep form state for corrections
    }
  } else if (error.response?.data?.message) {
    /// Show generic message
  } else {
    // Network or unknown error
    → Show "Please try again or contact support"
  }
}
```

### **Toast Notifications**:
- ✅ Success: "Sale completed successfully! Invoice #..."
- ❌ Error: "Customer Required", "Stock Out", "Validation Error", etc.
- ⚠️ Warning: "Item already in list", "Stock insufficient"
- ℹ️ Info: Confirmation dialogs for payment mode, card prices, reset

---

## 💰 Price Calculation System

### **Price Types**:
1. **Retail**: Standard MRP price (`item.retail_price`)
2. **Wholesale**: Bulk/registered customer price (`item.wholesale_price`)
3. **Card**: Card-specific price (`item.card_price`)

### **Pricing Logic Flow**:
```
getCurrentPrice(item):
  1. Check price_type setting
     - If 'retail' → return retail_price
     - If 'wholesale' → return wholesale_price || retail_price
     - If 'card' → return card_price || retail_price
  
  2. Check VAT-inclusive flag
     - If vat_inclusive=true → ALWAYS use retail_price (MRP is fixed)
  
  3. Default → return retail_price
```

### **Price Updates After Changes**:

| Change | Stationary Items | Printer Items | Currently-Being-Entered Item |
|--------|-----------------|---------------|------------------------------|
| price_type changes | NO change | YES, recalculate | YES, update input |
| payment_mode changes to card | NO change | YES, recalculate | YES, update input |
| payment_mode changes from card | NO change | YES, revert | YES, update input |
| VAT rate changes | NO change | NO change | NO change |

### **Bulk Discount Tier System**:
```
Item has up to 4 quantity-based discount tiers:
├─ Tier 1: If qty >= tier1_qty → discount tier1_discount
├─ Tier 2: If qty >= tier2_qty → discount tier2_discount
├─ Tier 3: If qty >= tier3_qty → discount tier3_discount
└─ Tier 4: If qty >= tier4_qty → discount tier4_discount

Highest matching tier is applied (checked from tier4 down)
Discount is: (unit_price × quantity) × discount%
Total = (unit_price × quantity) - discount
```

### **Free Issue Scheme**:
```
If item has free_issue_scheme_buy_qty and free_issue_scheme_get_qty:
  When qty >= buy_qty:
  free_quantity = floor(qty / buy_qty) × get_qty
  
Example: Buy 10, Get 2
  If qty=10 → free_qty=2
  If qty=20 → free_qty=4
  If qty=25 → free_qty=4
```

### **Wholesale Auto-Apply**:
```
If item has wholesale_min_qty:
  When qty >= wholesale_min_qty:
    Auto-apply wholesale_price instead of retail_price
```

### **Item-Level Discount** vs **Manual Discount**:
- **Item-Level**: Applied per item (stored in `discount_amount`)
- **Manual/Bulk**: Applied to entire invoice (stored in `discount_amount` form field)
- **Total Discount**: Item-level + Manual combined
- **VAT Calculation**: Based on NET amount (after item-level discount)

---

## 🧮 VAT & Tax Handling

### **Two VAT Models**:

#### **Model 1: VAT-Exclusive Items** (Traditional)
```
Unit Price: 1000 (excluding VAT)
Item Discount: 0
Net = 1000
VAT @ 18% = 1000 × 0.18 = 180
Final Price to Customer = 1180
```

**In Calculation**:
- `vatableSubtotal` += net (for VAT calculation)
- `vatToAdd` += net × vatRate%
- Invoice Total = sum_of_nets + vatToAdd - manualDiscount

#### **Model 2: VAT-Inclusive Items** (MRP-based)
```
Unit Price: 1180 (including VAT)
Item Discount: 0
Net = 1180
VAT @ 18% = 1180 - (1180 / 1.18) = 180 (extracted for display)
Amount to Customer = 1180
```

**In Calculation**:
- `vatInclSubtotal` += net
- `vatExtracted` += net - (net / (1 + rate%))
- Invoice Total = sum_of_nets - discounts (VAT already in price)

### **Mixed VAT invoices** (Both Models):
- Both types can exist on same invoice
- Each calculated correctly
- Total VAT = vatToAdd + vatExtracted
- Both displayed in VAT Breakdown

### **VAT Rate Effective Dating**:
```typescript
// Rates stored with effective_date and optional end_date
allVatRates: [
  { vat_rate: 15, effective_date: '2024-01-01', end_date: '2024-12-31' },
  { vat_rate: 18, effective_date: '2025-01-01', end_date: null }
]

// When user changes transaction_date → find applicable rate
const applicableRate = allVatRates.find(r => {
  return transactionDate >= r.effective_date 
    && (!r.end_date || transactionDate <= r.end_date)
})
// Auto-update form.vat_rate to applicable rate
```

### **VAT Breakdown Display**:
```typescript
{
  vatable_subtotal: 5000,         // Net of exclusive items
  vat_to_add: 900,                // 5000 × 18%
  vat_inclusive_subtotal: 11800,  // Net of inclusive items
  vat_extracted: 1800,            // From 11800 (display only)
  vat_rate: 18
}
```

### **Totals Calculation**:
```typescript
if (is_vat_invoice) {
  tax_amount = vatToAdd + vatExtracted
  total_amount = grossTotal - totalDiscounts + vatToAdd
  // (VAT-inclusive items already contain VAT)
} else {
  tax_amount = 0
  total_amount = grossTotal - totalDiscounts
}
```

---

## 📝 Summary

This **Sales Create** component is a comprehensive **POS (Point of Sale) system** that handles:

✅ **Multi-item cart management** with real-time stock checking
✅ **Complex pricing logic** (retail/wholesale/card with VAT handling)
✅ **Bundle/NOS unit conversion** with automatic price adjustment
✅ **Quantity-based discount tiers** and free-issue schemes  
✅ **VAT invoicing** with both exclusive and inclusive item pricing
✅ **Payment method flexibility** (cash/card/cheque/bank transfer)
✅ **Customer management** (search/select/create on-the-fly)
✅ **Receipt printing** with PDF generation
✅ **Keyboard shortcuts** for power users
✅ **Inline editing** for quantities and discounts
✅ **Real-time total calculations** with VAT breakdown
✅ **Comprehensive error handling** and validation
✅ **State persistence** across form resets

The architecture uses **React hooks** for state management, **Axios** for backend communication, **Inertia.js** for form handling, and **Tailwind CSS** for UI styling. All calculations are done client-side for performance, with backend validation for data integrity.
