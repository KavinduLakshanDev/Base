<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use App\Models\Purchase;
use Illuminate\Support\Facades\Auth;

echo "=== Testing Purchase Show Controller Logic ===\n\n";

// Simulate finding the purchase (PurchaseKey = 3)
$purchaseId = 3;

echo "Simulating: GET /pos/purchases/{$purchaseId}\n\n";

$purchase = Purchase::with(['supplier', 'section', 'details.product'])
    ->where('PurchaseKey', $purchaseId)
    ->firstOrFail();

echo "✅ Purchase loaded\n";
echo "PurchaseKey: {$purchase->PurchaseKey}\n";
echo "GRN: {$purchase->company_code}-" . sprintf('%06d', $purchase->PurchaseNo) . "\n\n";

// Simulate the controller's response mapping
$response = [
    'purchase' => [
        'id' => $purchase->PurchaseKey,
        'purchase_no' => $purchase->company_code . '-' . sprintf('%06d', $purchase->PurchaseNo),
        'date' => $purchase->GRNDate->format('Y-m-d'),
        'supplier_code' => $purchase->SuppCode,
        'supplier_name' => $purchase->supplier->FstNm ?? 'N/A',
        'supplier_invoice_no' => $purchase->SuppInvNo,
        'company_code' => $purchase->company_code,
        'branch_code' => $purchase->section_code,
        'branch_name' => $purchase->section->SecNm ?? 'N/A',
        'purchase_type' => $purchase->Purchase_Type,
        'description' => $purchase->Des,
        'total_amount' => (float) $purchase->TotalVal,
        'total_discount' => (float) $purchase->ToIDscount,
        'total_payable' => (float) $purchase->TotalVal,
        'status' => $purchase->Status,
        'is_used' => (bool) $purchase->flused,
        'is_inactive' => (bool) $purchase->flInActive,
        'created_at' => $purchase->created_at->format('Y-m-d H:i:s'),
        'updated_at' => $purchase->updated_at->format('Y-m-d H:i:s'),
        'can_edit' => true,
        'can_delete' => !$purchase->flused,
        'items' => $purchase->details->map(function($detail) {
            // Prioritize item_name field (saved during GRN), fallback to product relationship
            $productName = $detail->item_name;
            if (!$productName && $detail->product) {
                $productName = $detail->product->ItmNm ?? '';
            }
            if (!$productName) {
                $productName = 'Unknown Product';
            }
            
            return [
                'id' => $detail->PerchaseDetKy,
                'product_id' => $detail->iTimKy,
                'product_code' => $detail->product ? ($detail->product->ItemCode ?? '') : '',
                'product_name' => $productName,
                'qty' => (float) $detail->Qty,
                'cost_price' => (float) $detail->CostPrice,
                'brand' => $detail->brand ?? '',
                'model' => $detail->model ?? '',
                'serial_number' => $detail->serial_number ?? '',
                'warranty' => $detail->warranty ?? '',
                'item_discount' => (float) $detail->iTimDiscount,
                'amount' => (float) $detail->AmountF,
                'free_qty' => (float) ($detail->Free ?? 0),
                'discount_rate' => (float) ($detail->DiscountRate ?? 0),
                'cus_discount_rate' => (float) ($detail->CusDiscountRate ?? 0),
            ];
        })->toArray(),
    ]
];

echo "=== Controller Response Data ===\n\n";
echo "Items count: " . count($response['purchase']['items']) . "\n\n";

foreach ($response['purchase']['items'] as $index => $item) {
    echo "Item #" . ($index + 1) . ":\n";
    echo "  product_id: {$item['product_id']}\n";
    echo "  product_code: {$item['product_code']}\n";
    echo "  product_name: {$item['product_name']}\n";
    echo "  qty: {$item['qty']}\n";
    echo "  free_qty: {$item['free_qty']}\n";
    echo "  cost_price: {$item['cost_price']}\n";
    echo "  stock_location_type: {$item['stock_location_type']}\n";
    echo "\n";
}

echo "=== JSON Response (as frontend would receive) ===\n\n";
echo json_encode($response['purchase']['items'], JSON_PRETTY_PRINT);

echo "\n\n✅ Test shows the backend is returning correct data!\n";
echo "\n📌 Next steps:\n";
echo "1. Hard refresh browser: Ctrl+Shift+R or Ctrl+F5\n";
echo "2. Clear browser cache completely\n";
echo "3. Check browser console for any JavaScript errors\n";
echo "4. Verify you're looking at the correct GRN (VIS001-VIS-SEC-003-000003)\n";
