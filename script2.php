<?php
$files = [
    'app/Http/Controllers/POS/PurchaseController.php',
    'app/Http/Controllers/PrinterTransferController.php',
    'app/Http/Controllers/Reports/StockBinCardController.php',
    'app/Http/Controllers/Reports/StockInHandReportController.php',
    'app/Http/Controllers/StockTakingController.php',
];
foreach($files as $file) {
    $content = file_get_contents($file);
    // Fix bare batch_no
    $content = str_replace("->orWhere(batch_no,", "->orWhere('batch_no',", $content);
    // Fix bare stock_in_hand.batch_no
    $content = str_replace("->orWhere(stock_in_hand.batch_no,", "->orWhere('stock_in_hand.batch_no',", $content);
    // Fix bare sih.batch_no
    $content = str_replace("->orWhere(sih.batch_no,", "->orWhere('sih.batch_no',", $content);
    
    // Also, one occurrence was $batchCol which became ->orWhere($batchCol, '>=', 'GRN-VIS-VIS-0026')
    // That is perfectly valid PHP, so no need to replace it.
    
    file_put_contents($file, $content);
    echo "Fixed $file\n";
}
