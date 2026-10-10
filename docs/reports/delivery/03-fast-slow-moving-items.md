# Delivery — Fast & Slow Moving Items Report

## Purpose ✅
Identify fast-moving and slow-moving SKUs within deliveries — with ability to view route-wise and sales-rep-wise movement. Useful for inventory planning and promotions.

## Data sources
- DeliveryItem (quantity, unit_price)
- Delivery (delivery_date, delivery_route_id, assigned_user_id)
- ItemMaster (CosPri, SlsPri, ItemCode, ItmNm)

## Filters / Inputs
- date_from / date_to
- group_by: global | route | rep
- threshold: top_n (default top 20) or percentile (top 10%)
- item_category, brand

## Output / Classification
- Fast-moving: top N by quantity (configurable)
- Slow-moving: bottom N by quantity OR items with sales < X units in period
- Data columns: ItemCode, ItemName, QtySold, Revenue (Rs.), AvgPrice (Rs.), MovementCategory

## Backend aggregation (Eloquent / SQL)
Sample SQL:

```sql
SELECT di.ItmKy, im.ItemCode, im.ItmNm, SUM(di.quantity) AS qty_sold,
       SUM(di.total_amount) AS revenue
FROM delivery_items di
JOIN deliveries d ON di.delivery_id = d.id
JOIN itemmaster im ON di.ItmKy = im.ItmKy AND di.batch_no = im.batch_no
WHERE d.delivery_date BETWEEN :from AND :to
  AND d.company_code = :company
GROUP BY di.ItmKy
ORDER BY qty_sold DESC
```

Then rank and pick top/bottom per `group_by` (route/rep) by adding `d.delivery_route_id` or `d.assigned_user_id` to GROUP BY.

## UI
- Page: `Reports/DeliveryItemMovement` (table + Pareto chart)
- Controls: date range, group (route|rep|global), top-N selector, CSV download
- Table: sortable by QtySold or Revenue; tag rows Fast/Slow; link to item detail

## CSV
- Columns: ItemCode, ItemName, QtySold, Revenue (`Rs.`), AvgUnitPrice (`Rs.`), MovementCategory

## Tests
- Unit/Feature: seeded deliveries with known volumes → assert top/bottom classification
- Playwright: apply group_by=route and top_n filter; verify table and chart

## Acceptance criteria
- Correct ranking by quantity for requested group
- Export contains expected totals and `Rs.` prefixes

## Performance
- Add index on `delivery_items.delivery_id` and `deliveries.delivery_date`
- Use server-side paging and `LIMIT/OFFSET` for large resultsets

---
Tip: Provide an optional `lookback_window` parameter (e.g., 30/90/180 days) so business users can compare fast movers over time.