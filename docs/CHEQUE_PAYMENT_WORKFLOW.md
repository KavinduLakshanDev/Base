# Cheque Payment & Return Workflow Guide

## Overview
This document explains how cheque payments in Sales integrate with the Cheque Return system to handle bounced cheques.

---

## Current System Architecture

### 1. **Sales Payment Methods**
Currently available payment modes in `/Sales/Create.tsx` and `/Sales/Edit.tsx`:
- Cash (F1)
- Credit (F2) - requires registered customer
- Card (F3)
- **Cheque ← NEED TO ADD AS BUILT-IN OPTION**
- Bank Transfer (available but separate)

### 2. **Existing Cheque Fields in Sales**
The form already has cheque fields available:
```typescript
cheque_no: ''              // Cheque number
cheque_bank: ''            // Bank name
cheque_branch: ''          // Branch name
cheque_date: ''            // Cheque date
```

### 3. **Existing Cheque Return System**
Location: `/pos/cheque-return`

**Features:**
- Search cheques by: Cheque Number + Bank Name + Branch Name
- Process returns: Increases customer outstanding balance
- Optional: Add service charge
- Automatic: Restores balance to oldest unpaid invoices/jobs

---

## Complete Workflow for Cheque Payments

### **Scenario: Customer Pays Invoice with Cheque**

```
STEP 1: Create Sales Invoice
├─ Customer Details: ABC Store
├─ Invoice Items: Rs. 50,000
├─ Payment Mode: [Need to select "Cheque"]
├─ Enter Cheque Details:
│  ├─ Cheque Number: CHQ12345
│  ├─ Bank: Commercial Bank
│  └─ Branch: Colombo Main
└─ Save Invoice

STEP 2: Cheque Bounces (Multiple Days Later)
├─ Go to: POS → Cheque Return
├─ Search Section:
│  ├─ Enter Cheque Number: CHQ12345
│  ├─ Bank Name: Commercial Bank
│  └─ Branch Name: Colombo Main
└─ Click "Search Cheque"

STEP 3: Process Return
├─ System shows the bounced cheque
├─ Select: Cheque (CHQ12345 - Rs. 50,000)
├─ Enter Return Details:
│  ├─ Return Date: [Today's Date]
│  ├─ Service Charge: Rs. 500 (optional)
│  └─ Return Reason: "Insufficient Funds"
├─ Click "Process Cheque Return"
└─ System automatically restores balance

RESULT:
├─ Customer outstanding balance: +Rs. 50,500 (cheque + service charge)
├─ Return entry created: RET-CHQ-0001
└─ Original invoice reopened for payment in cash/other methods
```

---

## How the System Works Behind the Scenes

### **When Cheque Return is Processed:**

1. **Database Entry Created:**
   - New `AccTrn` record with positive amount
   - Links to original payment via `original_payment_id`
   - Original payment marked as `FReturn = true`

2. **Customer Balance Restored:**
   - Cheque amount added back to customer's outstanding balance
   - Service charge (if any) also added
   - Linked to oldest unpaid invoices/jobs first

3. **Linking to Sales Cheque Payments:**
   - When you save a Sales invoice with cheque payment:
     ```php
     $chequePayment = AccTrn::create([
         'ChqueNo'      => $cheque_no,
         'BankNm'       => $cheque_bank,
         'BranchNm'     => $cheque_branch,
         'Amt'          => -$cheque_amount,  // Negative (payment)
         'Status'       => 'A',
         'FReturn'      => false,            // Not returned initially
         'company_code' => $user->company_code,
     ]);
     ```

   - When cheque is returned:
     ```php
     $chequeReturn = AccTrn::create([
         'ChqueNo'           => $original_cheque->ChqueNo,
         'Amt'               => abs($original_cheque->Amt),  // Positive (restoration)
         'original_payment_id' => $original_cheque->AccTrnKy,
         'Reason'            => 'Cheque Return: ' . $reason,
         'company_code'      => $user->company_code,
     ]);
     
     $original_cheque->update(['FReturn' => true]);
     ```

---

## Implementation Steps

### **Step 1: Add Cheque as Payment Mode Option**

**File:** `PaymentTotalsSection.tsx`

Add new radio button option:
```typescript
<label className="flex items-center space-x-2 cursor-pointer">
    <input
        type="radio"
        name="payment_mode"
        value="cheque"
        checked={data.payment_mode === 'cheque'}
        onChange={() => handlePaymentModeChange('cheque')}
        className="w-4 h-4 text-blue-600 focus:ring-blue-400"
    />
    <span className="text-xs font-medium">Cheque <span className="text-[10px] text-slate-400">(F4)</span></span>
</label>
```

### **Step 2: Show Cheque Fields When Selected**

Add conditional rendering:
```typescript
{data.payment_mode === 'cheque' && (
    <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="grid grid-cols-2 gap-2">
            <Input
                label="Cheque Number"
                value={data.cheque_no}
                onChange={(e) => setData('cheque_no', e.target.value)}
                placeholder="e.g., CHQ12345"
            />
            <Input
                label="Cheque Date"
                type="date"
                value={data.cheque_date}
                onChange={(e) => setData('cheque_date', e.target.value)}
            />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <Input
                label="Bank Name"
                value={data.cheque_bank}
                onChange={(e) => setData('cheque_bank', e.target.value)}
                placeholder="e.g., Commercial Bank"
            />
            <Input
                label="Branch Name"
                value={data.cheque_branch}
                onChange={(e) => setData('cheque_branch', e.target.value)}
                placeholder="e.g., Colombo Main"
            />
        </div>
    </div>
)}
```

### **Step 3: Input Cheque Payment Amount**

```typescript
{data.payment_mode === 'cheque' && (
    <Input
        label="Cheque Amount"
        type="number"
        value={data.cheque_payment}
        onChange={(e) => setData('cheque_payment', e.target.value)}
        placeholder="0.00"
    />
)}
```

### **Step 4: Add Keyboard Shortcut (F4 for Cheque)**

**File:** `Create.tsx` keyboard shortcuts:
```typescript
if (e.key === 'F4') {
    e.preventDefault();
    handlePaymentModeChange('cheque');
}
```

---

## Processing a Cheque Return

### **When Customer's Cheque Bounces:**

1. Navigate to: **POS → Cheque Return**

2. **Search for the cheque:**
   - Cheque Number: CHQ12345
   - Bank Name: Commercial Bank
   - Branch Name: Colombo Main

3. **Enter return details:**
   - Return Date: [Date received]
   - Service Charge: Rs. 500 (optional)
   - Return Reason: Insufficient Funds / Stopped Payment

4. **Click "Process Cheque Return"**

5. **System automatically:**
   - ✅ Marks original cheque payment as returned (`FReturn = true`)
   - ✅ Restores customer's outstanding balance
   - ✅ Links oldest unpaid invoices for new payment attempt
   - ✅ Creates audit trail with return number

---

## Key Points to Remember

### **For Sales Staff:**
- ✅ Use "Cheque" payment mode when customer pays by cheque
- ✅ Always enter complete cheque details (No, Bank, Branch, Date)
- ✅ Keep customer's contact info for follow-up on bounced cheques

### **For Accounts Team:**
- ✅ When cheque bounces, go to **POS → Cheque Return**
- ✅ Search and process the return immediately
- ✅ Add service charge if per bank policy
- ✅ Customer balance automatically restored
- ✅ Customer must pay again in cash/card/online

### **For Management:**
- ✅ Monitor "Cheque Return History" for problem customers
- ✅ Review return reasons: Insufficient Funds, Stopped Payment, etc.
- ✅ Track service charges revenue
- ✅ Follow up with customers on bounced cheques

---

## Data Model: How Cheques Are Linked

```
Sales Transaction (Invoice)
├─ Payment: Cheque (CHQ12345)
├─ Amount: -50,000 (negative = payment)
└─ Stored in: AccTrn table

    When Cheque Bounces:
    └─ ChequeReturnController.returnCheque()
       ├─ Finds: AccTrn where ChqueNo = CHQ12345
       ├─ Creates: New AccTrn (return entry)
       ├─ Amount: +50,000 (positive = restoration)
       ├─ Links: original_payment_id → original AccTrn
       ├─ Flags: original.FReturn = true
       └─ Restores: Customer balance + service charge

Result: Customer's outstanding balance = +50,500
```

---

## Troubleshooting

### **"Cheque not found in system"**
- ✓ Verify cheque number is entered correctly
- ✓ Verify bank name matches exactly as in sales invoice
- ✓ Check if cheque was recorded as payment (not just bank transfer)

### **"Cheque already returned"**
- ✓ System prevents duplicate returns
- ✓ Use Cheque Return History to see previous return date
- ✓ Contact manager if customer disputes return

### **"Customer balance not restored"**
- ✓ This should happen automatically
- ✓ Check AccMas.CurBal updated in customer master
- ✓ Contact IT support if issue persists

---

## Related Pages

- **Create Sale:** `/sales/create` - Create invoice with cheque payment
- **Edit Sale:** `/sales/{id}/edit` - Modify cheque payment details
- **Cheque Return:** `/pos/cheque-return` - Process bounced cheques
- **Sales Index:** `/sales` - View all invoices

---

**Last Updated:** March 18, 2026  
**Version:** 1.0  
**Maintained By:** System Admin
