<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\StockInHand;
use App\Models\ServiceJob;
use App\Models\ServiceJobItem;
use Illuminate\Support\Facades\DB;

echo "=== PRINTER STOCK TRACKING VERIFICATION ===\n\n";

// Get a printer item from purchase_det with serial number
$printerFromPurchase = DB::table('purchase_det as pd')
    ->join('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
    ->whereNotNull('pd.serial_number')
    ->where('pd.serial_number', '!=', '')
    ->where('pd.section_code', 'VIS-SEC-001')
    ->select(
        'pd.iTimKy as ItmKy',
        'pd.item_name',
        'pd.serial_number',
        'pd.brand',
        'pd.model',
        'pd.batch_no',
        'im.ItemCode'
    )
    ->first();

if (!$printerFromPurchase) {
    echo "❌ No printer found in purchase_det with serial number for VIS-SEC-001\n";
    echo "Please ensure you have printers in the service section first.\n";
    exit;
}

echo "Found Printer:\n";
echo "  Item Code: {$printerFromPurchase->ItemCode}\n";
echo "  Name: {$printerFromPurchase->item_name}\n";
echo "  Serial Number: {$printerFromPurchase->serial_number}\n";
echo "  Brand: {$printerFromPurchase->brand}\n";
echo "  Model: {$printerFromPurchase->model}\n";
echo "  Batch: {$printerFromPurchase->batch_no}\n\n";

// Check current stock for this specific printer (by serial number)
$currentStock = DB::table('stock_in_hand')
    ->where('ItemKy', $printerFromPurchase->ItmKy)
    ->where('section_code', 'VIS-SEC-001')
    ->where('serial_number', $printerFromPurchase->serial_number)
    ->selectRaw('SUM(Qty + COALESCE(FreeQty, 0)) as net_qty')
    ->value('net_qty');

echo "Current Stock: " . ($currentStock ?? 0) . "\n\n";

if ($currentStock <= 0) {
    echo "❌ No stock available for this printer. Please add stock first.\n";
    exit;
}

// Get recent service jobs
$recentServiceJob = ServiceJob::orderBy('created_at', 'desc')->first();

if (!$recentServiceJob) {
    echo "❌ No service jobs found in the database.\n";
    exit;
}

echo "Using Service Job: #{$recentServiceJob->job_number}\n\n";

// Check if this printer was used in any service jobs
$serviceJobItems = ServiceJobItem::where('ItmKy', $printerFromPurchase->ItmKy)
    ->where('serial_number', $printerFromPurchase->serial_number)
    ->with('serviceJob')
    ->get();

echo "Service Job Items with this Printer:\n";
echo str_repeat('-', 80) . "\n";

if ($serviceJobItems->isEmpty()) {
    echo "No service job items found for this printer.\n";
} else {
    foreach ($serviceJobItems as $item) {
        echo "Job: {$item->serviceJob->job_number}\n";
        echo "  Item: {$item->item_name}\n";
        echo "  Quantity: {$item->quantity}\n";
        echo "  Serial: {$item->serial_number}\n";
        echo "  Brand: {$item->brand}\n";
        echo "  Model: {$item->model}\n";
        echo "  Batch: {$item->batch_no}\n";
        echo str_repeat('-', 80) . "\n";
    }
}

echo "\n=== STOCK TRANSACTIONS FOR THIS PRINTER ===\n\n";

// Get all stock transactions for this specific printer (by serial number)
$stockTransactions = StockInHand::where('ItemKy', $printerFromPurchase->ItmKy)
    ->where('serial_number', $printerFromPurchase->serial_number)
    ->orderBy('created_at', 'desc')
    ->take(20)
    ->get();

echo "Found " . $stockTransactions->count() . " stock transactions\n";
echo str_repeat('-', 80) . "\n";

foreach ($stockTransactions as $trans) {
    echo "Date: {$trans->OrdDate}\n";
    echo "  Type: {$trans->TrnTyp}\n";
    echo "  Qty: {$trans->Qty} (Free: {$trans->FreeQty})\n";
    echo "  RefNo: {$trans->RefNo}\n";
    echo "  Serial: {$trans->serial_number}\n";
    echo "  Brand: {$trans->brand}\n";
    echo "  Model: {$trans->model}\n";
    echo "  Batch: {$trans->batch_no}\n";
    echo "  Section: {$trans->section_code}\n";
    
    if ($trans->TrnTyp === 'SERVICE_JOB' || $trans->TrnTyp === 'SERVICE_JOB_RETURN') {
        echo "  ✅ SERVICE JOB TRANSACTION FOUND!\n";
        $serviceJob = ServiceJob::find($trans->OrdKy);
        if ($serviceJob) {
            echo "  Job: {$serviceJob->job_number}\n";
        }
    }
    
    echo str_repeat('-', 80) . "\n";
}

echo "\n=== PRINTER STOCK BIN CARD CHECK ===\n\n";

// Check if SERVICE_JOB transactions would appear in printer bin card
$serviceJobTransactions = StockInHand::where('serial_number', $printerFromPurchase->serial_number)
    ->whereIn('TrnTyp', ['SERVICE_JOB', 'SERVICE_JOB_RETURN'])
    ->count();

if ($serviceJobTransactions > 0) {
    echo "✅ Found {$serviceJobTransactions} SERVICE_JOB transactions for printer stock bin card\n";
} else {
    echo "⚠️  No SERVICE_JOB transactions found yet for this printer\n";
}

echo "\n=== PRINTER STOCK IN HAND CALCULATION ===\n\n";

// Calculate stock the same way the printer stock report does
$printerStock = DB::table('stock_in_hand')
    ->where('serial_number', $printerFromPurchase->serial_number)
    ->selectRaw('
        serial_number,
        brand,
        model,
        SUM(COALESCE(Qty, 0) + COALESCE(FreeQty, 0)) as balance
    ')
    ->groupBy('serial_number', 'brand', 'model')
    ->first();

if ($printerStock) {
    echo "Printer Stock Summary:\n";
    echo "  Serial: {$printerStock->serial_number}\n";
    echo "  Brand: {$printerStock->brand}\n";
    echo "  Model: {$printerStock->model}\n";
    echo "  Balance: {$printerStock->balance}\n";
    echo "\n";
    
    if ($printerStock->balance == $currentStock) {
        echo "✅ Stock calculations match!\n";
    } else {
        echo "⚠️  Stock mismatch: Printer report shows {$printerStock->balance}, but direct query shows {$currentStock}\n";
    }
} else {
    echo "❌ No printer stock found for this serial number\n";
}

echo "\n=== VERIFICATION COMPLETE ===\n";
echo "\nTo fully test:\n";
echo "1. Add this printer to a service job via the web interface\n";
echo "2. Check the Printer Stock Bin Card report\n";
echo "3. Verify the 'Service Job - Parts Used' transaction appears\n";
echo "4. Remove the printer from the service job\n";
echo "5. Verify the 'Service Job - Parts Returned' transaction appears\n";
echo "6. Check that the Printer Stock In Hand report shows correct balance\n";

echo "\nDone!\n";
