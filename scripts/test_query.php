<?php

$dupes = App\Models\SalesTransactionItem::join('sales_transactions', 'sales_transaction_items.sales_transaction_id', '=', 'sales_transactions.id')
->leftJoin('itemmaster', function($join) { 
    $join->on(function($q) { 
        $q->on('itemmaster.ItmKy', '=', 'sales_transaction_items.product_id')
          ->orOn('itemmaster.ItemCode', '=', 'sales_transaction_items.item_code'); 
    })->on('itemmaster.company_code', '=', 'sales_transaction_items.company_code'); 
})
->select('sales_transaction_items.id')
->groupBy('sales_transaction_items.id')
->havingRaw('COUNT(*) > 1')
->count();

echo "Duplicate items found: $dupes\n";
