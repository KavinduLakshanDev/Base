# GRN Barcode Printing Feature

## Overview
The Barcode Printing Feature allows users to easily generate and print physical labels for items received through Goods Receipt Notes (GRN). It utilizes an internal PHP library to generate the barcode images on the fly and formats them into an easily printable PDF grid.

## Key Technologies
- **Barcode Generator:** `picqer/php-barcode-generator`
  - *Standard Used:* `CODE_128` (Robust, widely supported alphanumeric encoding standard).
  - *Generation Method:* Outputs Base64-encoded PNG image streams.
- **PDF Renderer:** `barryvdh/laravel-dompdf` (Wrapper for DOMPDF)
- **Frontend Integration:** Inertia.js (React)

## Workflow

1. **User Action:**
   The user clicks the **"Print Barcodes"** button from either the main GRN list view (`index.tsx`) or the GRN detailed view (`show.tsx`).

2. **Data Preparation (`PurchaseController@printBarcodes`):**
   - The controller receives the ID of the Purchase (GRN).
   - It iterates through the `purchase_det` (Purchase Details) to load every item received.
   - For every item, it repeats the barcode generation exactly `Qty` times. If `Qty` is 10, it queues 10 identical labels for that item.

3. **Identifier Selection:**
   The system smartly selects the best string to encode into the barcode using the following priority:
   1. `serial_number`: Selected if the item type is a printer or serialized item.
   2. `BarCode`: Selected from the `itemmaster` (Product) table if available.
   3. `ItemCode`: Used as a fallback if the above are empty.
   4. `product_name`: Used as a final fallback (though rare).

4. **PDF Rendering (`barcodes.blade.php`):**
   - The generated base64 PNGs, along with the item name, string code, and cost price, are passed to the blade template.
   - The template formats the labels into a responsive grid.
   - DOMPDF converts this HTML view into a PDF document and streams it back to the browser in a new tab.

## Code Structure

- **Controller:** `app/Http/Controllers/POS/PurchaseController.php` (Method: `printBarcodes()`)
- **Route:** `GET /pos/purchases/{purchase}/print-barcodes` in `routes/web.php`
- **View:** `resources/views/purchases/barcodes.blade.php`
- **Frontend Buttons:**
  - `resources/js/pages/pos/purchases/index.tsx`
  - `resources/js/pages/pos/purchases/show.tsx`

## Usage Notes
- The resulting PDF is designed to be sent directly to a physical label printer. 
- Adjusting the CSS within `barcodes.blade.php` might be necessary depending on the physical dimensions of the specific label stock used by the warehouse (e.g., standard 30x50mm thermal labels).
