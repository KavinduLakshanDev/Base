# Delivery — Collection Report (payment-method & rep-wise comparison)

## Purpose ✅
Show collections (payments) related to deliveries with breakdown by payment method and per-sales-rep comparison (this period vs previous period).

## Key models / tables
- DeliveryPayment (app/Models/DeliveryPayment)
- Delivery (for rep/route linkage)
- User (sales reps)

## Filters
- date_from / date_to (period)
- compare_with_previous (boolean) — default true
- rep_id, route_id, payment_method (cash, card, bank_transfer, cheque), company_code

## UI
- Page: `Reports/DeliveryCollectionReport` (`resources/js/pages/Reports/DeliveryCollectionReport.tsx`)
- Controls: date range, rep selector, payment method selector
- Panels:
  - KPI: Total collections (Rs.), Cash, Card, Bank, Cheque
  - Table: per-rep rows with columns `This period (Rs.)`, `Previous period (Rs.)`, `Delta (%)`
  - Stacked bar for payment-method distribution per-rep
- CSV export: include payment_method breakdown

## Routes / Controller
- GET `/reports/delivery-collections` → `Reports\DeliveryCollectionReportController@index`
- GET `/reports/delivery-collections/export` → export CSV
- Permission: `deliveries.view`

## Backend — Queries
- Base: DeliveryPayment::whereBetween('payment_date', [$dateFrom, $dateTo])->where('company_code', $companyCode)
- Join Delivery to get `assigned_user_id` (sales rep)
- Aggregate: SUM(amount) GROUP BY recorded_by (or delivery.assigned_user_id) and method
- For comparison: compute same aggregates for previous period (shift date range by length)

SQL example (conceptual):

```sql
SELECT u.id AS rep_id, u.first_name, dp.method, SUM(dp.amount) as total
FROM delivery_payments dp
JOIN deliveries d ON dp.delivery_id = d.id
JOIN users u ON d.assigned_user_id = u.id
WHERE dp.payment_date BETWEEN :from AND :to
GROUP BY u.id, dp.method
```

## CSV columns
- Sales Rep, Payment Method, This Period (Rs.), Previous Period (Rs.), Change (%)

## Tests
- PHPUnit: assert Inertia props contain `by_rep` with `this_period` and `previous_period` totals
- CSV: ensure `Rs.` prefix and payment_method columns
- Playwright: verify filter by payment_method and per-rep comparison shows correct delta

## Acceptance criteria
- Collections sum equals sum of DeliveryPayment.amount for the period
- Comparison period calculation is correct and visible per-rep
- Payment-method breakdown totals match data

## Notes
- Use `payment_date` (not recorded_at) for period boundaries
- For partial payments ensure aggregation uses sum(amount)
- Reuse UI components from `CollectionReport.tsx` where possible

---
Recommendation: Add small endpoint `/reports/delivery-collections/summary-by-rep` returning JSON series for charts (stacked bars).