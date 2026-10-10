# Delivery — Profit Calculation Report

## Purpose ✅
Calculate gross profit for deliveries: (unit_sales_price - unit_cost_price) * quantity. Filterable by sales rep and route.

## Data sources
- DeliveryItem (unit_price, quantity)
- ItemMaster (CosPri, NCostPrice fallback)
- Delivery (delivery_date, delivery_route_id, assigned_user_id)

## Filters
- date_from / date_to
- rep_id, route_id, item_id, shop_id
- group_by: rep | route | item

## Calculation rules
- For each delivery_item:
  - sales_value = quantity * delivery_item.unit_price
  - cost_value = quantity * coalesce(itemmaster.CosPri, itemmaster.NCostPrice, 0)
  - profit = sales_value - cost_value
- profit_margin_pct = profit / sales_value (guard divide-by-zero)

## Backend (Eloquent example)
```php
$rows = DB::table('delivery_items as di')
  ->join('deliveries as d', 'd.id', 'di.delivery_id')
  ->leftJoin('itemmaster as im', function($j){
      $j->on('im.ItmKy','di.ItmKy')->on('im.batch_no','di.batch_no');
  })
  ->selectRaw(
     'di.ItmKy, im.ItemCode, im.ItmNm, SUM(di.quantity) as qty, '
     . 'SUM(di.quantity * di.unit_price) as sales_value, '
     . 'SUM(di.quantity * COALESCE(im.CosPri, im.NCostPrice, 0)) as cost_value '
  )
  ->whereBetween('d.delivery_date', [$from, $to])
  ->groupBy('di.ItmKy')
  ->get();

// compute profit = sales_value - cost_value
```

## UI
- Page: `Reports/DeliveryProfitReport` (`resources/js/pages/Reports/DeliveryProfitReport.tsx`)
- Table columns: Item / SKU, Qty, Sales Value (Rs.), Cost Value (Rs.), Profit (Rs.), Margin (%)
- Filters: date range, rep, route, item; CSV export

## CSV
- Columns: ItemCode, ItemName, Qty, SalesValue (Rs.), CostValue (Rs.), Profit (Rs.), Margin (%)

## Tests
- PHPUnit: create deliveries + delivery_items + itemmaster rows with CosPri → assert expected profit totals
- Playwright: verify UI filters and exported CSV profit numbers

## Acceptance criteria
- Profit equals SUM(qty*(unit_price - cost_price)) for filtered range
- Uses `CosPri` / `NCostPrice` fallback when cost price missing
- CSV export matches UI numbers

## Edge cases
- Missing item master entry → treat cost as 0 and mark row with warning
- Zero sales_value → show margin as `—` or `0%`

## Performance
- Pre-join on `ItmKy` is required; ensure `itemmaster.ItmKy` is indexed
- Consider caching daily profit aggregates for heavy reporting use

---
Implementation note: mirror the `DeliverySummaryReportController` filter contract and `Rs.` currency formatting for exports.