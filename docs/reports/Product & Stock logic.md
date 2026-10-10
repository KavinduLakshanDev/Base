# Product, GRN, and Stock Logic Summary

This document summarizes the discussions regarding Goods Receipt Note (GRN) creation, product editing, batch management, and stock tracking within the system.

## 1. GRN Batch Number Creation
During the GRN creation process (in `resources/js/pages/pos/purchases/create.tsx`), the GRN Number and Product Codes are dynamically generated:

* **GRN Number (`grnNo`)**: 
  * If a user company code exists, it extracts the numeric part, formats it with a `C` prefix (e.g., `C01`), and appends a padded 6-digit purchase number (e.g., `C01-000123`).
  * If no company code exists, it defaults to `GRN-000123`.
* **Auto-Generated Product Codes (For New Untracked Stock)**:
  * **Stationary Items (Main Stock)**: Generates a code like `MS-{CategoryCode}-{Timestamp}` (e.g., `MS-CAT001-1688825000000`).
  * **Printer Items (Printing Section)**: Generates a code like `PS-{CategoryCode}-{Timestamp}` (e.g., `PS-CAT002-1688825000000`).

## 2. `stock_in_hand` Table Architecture
The `stock_in_hand` table is a **transactional stock ledger**, not a snapshot of current stock. It tracks every movement of stock inwards and outwards.

* **Stock In (+)**: GRNs and Customer Returns create records with positive quantities (e.g., `Qty = 100`).
* **Stock Out (-)**: Deliveries, Sales, Transfers (TRF-OUT), and Wastage create records with negative quantities (e.g., `Qty = -5`).
* **Current Stock Calculation**: The system dynamically calculates the stock in hand by summing the `Qty` column for a specific item in a specific branch (`SELECT sum(Qty) FROM stock_in_hand WHERE ItemKy = ? AND section_code = ?`).
* **Serialization & Tracking**: It contains columns like `batch_no`, `serial_number`, `brand`, and `model` to allow tracking of specific batches and individual units (like Printers with `Qty = 1`).

## 3. Product Edit: Batch Selection Logic
In the Product Edit section, the Batch No dropdown **only shows batches that currently have stock in hand**.

* **Backend Query (`ProductController::getBatches`)**:
  The system queries `stock_in_hand`, groups by `batch_no`, and applies `havingRaw('SUM(Qty) > 0')`. 
  This ensures that if a batch's stock drops to 0 (all items sold or transferred), it will automatically disappear from the dropdown list.

## 4. Price Saving and Updating Mechanism
When editing a product and selecting a specific batch, the prices (Cost Price, Selling Price, Wholesale Price, Vehicle Sale Price) correctly load and update for that specific batch.

### Where are prices saved?
Prices are saved across three main tables:
1. **`purchase_det` (Purchase Details)**: Stores the **original baseline prices** recorded at the exact moment the stock was received via GRN.
2. **`item_price_det` (Item Price History/Details)**: Stores **updates, overrides, and history** for specific batches. 
3. **`itemmaster` (Item Master)**: Stores the **master default prices** for the product as a whole.

### How it works when editing:
1. **Loading**: The system checks `item_price_det` first for the most recent price override of the selected batch. If none exists, it falls back to the original `purchase_det` record.
2. **Saving (`ProductController::update`)**:
   * It specifically targets the chosen batch (`->where('batch_no', $data['batch_no'])`).
   * **Keep Price History**: If checked, a new row is inserted into `item_price_det` keeping the old price intact. If unchecked, it updates the most recent record for that batch.
   * **Syncing**: As a safety measure, the new selling/cost price is also synced back to the original `purchase_det` record for that batch.
   * This guarantees that modifying the price for Batch A has absolutely no effect on the prices for Batch B.
