# Cheque Return & Purchase Order Report Implementation Guide

## Overview
This document details the implementation of two major features in the Distribution System: **Cheque Return Management** and **Purchase Order Reports**. These features enhance the financial control and reporting capabilities of the system.

---

## 1. Cheque Return Management

### Overview
The Cheque Return Management module allows POS users to handle customer cheque returns efficiently. It provides functionality to search for valid cheques, view details, and process returns, automatically updating customer outstanding balances.

### Key Features
- **Search Functionality**: Search for cheques by Cheque Number, Bank Name, and Branch Name.
- **Validation**: Displays only valid, unreturned cheques with negative amounts (payments).
- **Detailed View**: Shows cheque details alongside customer and address information.
- **Return Processing**: Records return date and reason, updates transaction history, and adjusts customer ledger.
- **Visual Feedback**: Real-time notifications for success, errors, and warnings about balance impact.

### Technical Implementation

#### Backend: `App\Http\Controllers\POS\ChequeReturnController.php`
- **`index()`**: Renders the React frontend page.
- **`searchCheque()`**: 
  - Validates inputs.
  - Queries `AccTrn` for matching payment records (`Amount < 0`).
  - Filters out already returned cheques using `original_payment_id`.
  - Returns JSON response with cheque and customer data.
- **`returnCheque()`**:
  - Uses DB Transactions (`beginTransaction`, `commit`, `rollBack`).
  - Locks rows (`lockForUpdate`) to prevent race conditions.
  - Creates `TrnMas` record for transaction master.
  - Creates `AccTrn` record with positive amount to reverse payment.
  - Updates `AccMas` customer `CurBal` (Current Balance).
  - Generates unique return number using `NumberGeneratorService`.

#### Frontend: `resources/js/pages/pos/cheque-return/index.tsx`
- **Component Structure**:
  - **Header**: Navigation and summary statistics.
  - **Search Column**: Form to find cheques.
  - **Results List**: Interactive list of found cheques.
  - **Processing Column**: Details of selected cheque and return form.
- **State Management**: Uses React `useState` and Inertia `useForm`.
- **UI/UX**: Gradient styling, Lucide icons, and responsive layout.

#### Data Models
- **`TrnMas`**: Transaction master record.
- **`AccTrn`**: Account transaction details (links return to original payment via `original_payment_id`).
- **`AccMas`**: Customer account master (balance update).

#### Routes
- `GET /pos/cheque-return`: Index page.
- `POST /pos/cheque-return/search`: Search API.
- `POST /pos/cheque-return/process`: Process Return API.

---

## 2. Purchase Order Report

### Overview
The Purchase Order Report provides a comprehensive view of purchase activities. It allows generating reports based on date ranges, suppliers, and order status, with options to view on-screen or download as PDF.

### Key Features
- **Flexible Filtering**: Filter by Date Range (From/To), Supplier, and Status.
- **Summary Cards**: Quick stats for Total Orders, Total Value, and Item Counts.
- **Data Table**: Detailed list of purchase orders with status badges.
- **PDF Export**: Generate professional PDF reports for printing or archiving.

### Technical Implementation

#### Backend: `App\Http\Controllers\Reports\PurchaseOrderReportController.php`
- **`index()`**: 
  - Fetches suppliers for filter dropdown.
  - Queries `Purchase` model based on filters.
  - Calculates totals and summary statistics.
  - Returns paginated data to Inertia view.
- **`pdf()`**:
  - Reuses query logic to fetch all matching records.
  - Loads `reports.purchase-orders-pdf` Blade view.
  - Generates PDF using DOMPDF wrapper.

#### Frontend: `resources/js/pages/Reports/PurchaseOrderReport.tsx`
- **Filters**: Date pickers and searchable dropdowns for suppliers.
- **Summary Section**: Dashboard-style cards showing key metrics.
- **Table**: Responsive data table with distinct status styling.
- **Export**: Button to trigger PDF download with current filters.

#### PDF Template: `resources/views/reports/purchase-orders-pdf.blade.php`
- **Styling**: Print-friendly CSS.
- **Layout**: Header with company info, summary section, and tabulated data.

#### Routes
- `GET /reports/purchase-orders`: View report page.
- `GET /reports/purchase-orders/pdf`: Download PDF.

---

## 3. Navigation & Integration

### Sidebar Updates (`resources/js/components/app-sidebar.tsx`)
- Added **Cheque Return** under the **Payments** section.
- Added **Purchase Order Report** under the **Reports** section.
- Icons: `RefreshCw` (Cheque Return) and `FileText` (Report).

### Usage Guide

#### How to Process a Cheque Return
1. Navigate to **POS > Cheque Return**.
2. Enter the **Cheque Number**, **Bank**, and **Branch** in the search form.
3. Click **Search**.
4. Select the correct cheque from the results list.
5. Review the details in the right-hand panel.
6. Enter the **Return Date** and **Reason**.
7. Click **Process Return**.
8. Success message will confirm the return number and balance update.

#### How to Generate Purchase Order Report
1. Navigate to **Reports > Purchase Orders**.
2. Select a **Date Range**.
3. (Optional) Select a specific **Supplier** or **Status**.
4. Click **Filter** to view results on screen.
5. Click **Download PDF** to get a printable version.
