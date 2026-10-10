# Delivery — Sales Report

## Purpose ✅
Route-wise and Sales-Rep-wise sales report for deliveries. Supports daily view and arbitrary date ranges. Shows deliveries, items sold and revenue with optional time-series breakdown.

## Key models / tables
- Delivery (app/Models/Delivery)
- DeliveryItem (app/Models/DeliveryItem)
- DeliveryRoute (app/Models/DeliveryRoute)
- User (sales reps)
- ItemMaster (for item metadata)

## Filters
- date_from, date_to (required — default last 30 days)
- granularity: daily | weekly | monthly | none
- route_id ("all" or specific)
- rep_id ("all" or specific)
- shop_id
- status (delivered | all)
- paginate / per_page

## UI (Inertia + React)
- Page: `Reports/DeliverySalesReport` (`resources/js/pages/Reports/DeliverySalesReport.tsx`)
- Components: filter bar (date / route / rep / granularity), KPI cards (Sales, Deliveries, Items), table grouped by route/rep (includes total qty and a breakdown of each item with its delivered quantity; item names are clickable to open a modal with the full list). Tables are hidden when no specific route or sales rep is selected – a prompt appears asking the user to pick a filter. The modal displays all available fields such as delivery number, item code, batch, unit price and total amount, arranged in a table with columns for item name, delivery #, code, batch, qty, unit price and total., time-series chart (recharts line)
- CSV export button — currency values prefixed with `Rs.` (follow existing project convention)

## Routes & Permissions
- GET `/reports/delivery-sales` → `Reports\DeliverySalesReportController@index` (Inertia)
- GET `/reports/delivery-sales/export` → `Reports\DeliverySalesReportController@export` (CSV)
- Permission: `deliveries.view`

## Backend — Aggregation (Eloquent / SQL)
Example Eloquent (simplified):

```php
$query = Delivery::where('company_code', $companyCode)
    ->whereBetween('delivery_date', [$dateFrom, $dateTo])
    ->where(function($q) use ($routeId) { if ($routeId && $routeId !== 'all') $q->where('delivery_route_id', $routeId); })
    ->with('items', 'assignedUser', 'deliveryRoute');

$deliveries = $query->get();
$totalSales = $deliveries->sum(fn($d) => $d->items->sum('total_amount'));
$totalItems = $deliveries->sum(fn($d) => $d->items->sum('quantity'));

// Group by route
$byRoute = $deliveries->groupBy('delivery_route_id')->map(...);
// Group by rep
$byRep = $deliveries->groupBy('assigned_user_id')->map(...);
```

For larger data sets use DB::table + groupBy + SUM for server-side paging.

The aggregated results include an `items_list` array for each route/rep with objects containing `name` and `quantity`, allowing the UI to display exactly which items and how many of each were delivered. In addition the controller now provides an `items_details` array containing full delivery item records (`delivery_number`, `item_code`, `batch_no`, `unit_price`, `total_amount`, etc.), which the frontend uses when the user clicks the item list to populate the details modal.
## CSV export columns
- Date, Delivery #, Route, Sales Rep, Customer, Items Count, Total Sales (`Rs.`), Avg Ticket (`Rs.`)

## Tests
- PHPUnit feature test: assert Inertia props (`summary`, `by_route`, `by_rep`) and filters work.
- CSV unit test: request `/export` for sample data and assert `Rs.` prefix and totals.
- Playwright E2E: apply filters, verify KPIs, chart points, and downloaded CSV content.

## Acceptance criteria
- Can filter by date/route/rep and get correct totals
- Export includes `Rs.` currency prefix
- Time-series reflects filtered date range

## Performance
- Index `deliveries(delivery_date)`, `deliveries(delivery_route_id)`, `delivery_items(ItmKy)`
- For high volume use pre-aggregated daily_sales table

---

Implementation note: follow the `DeliverySummaryReportController` pattern for filters, Inertia props and export formatting.