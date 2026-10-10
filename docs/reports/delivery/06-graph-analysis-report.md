# Delivery — Graph / Analysis Report

## Purpose ✅
Dashboards and charts for delivery operations: time-series for Sales & Collections, and performance leaderboards (best route, best sales rep). Designed for quick visual analysis and drill-down to the other reports.

## Charts to include
- Sales (time-series) — daily/weekly/monthly
- Collections (time-series) — same granularity
- Top routes by revenue (bar)
- Top sales reps by revenue or collection (bar)
- Payment-method distribution (pie / stacked)
- Fast/slow-moving items summary (mini Pareto)

## Data endpoints
- GET `/reports/delivery-graph-analysis` → Inertia page + summary props (time_series, by_route, by_rep)
- GET `/reports/delivery-graph-analysis/export` → CSV export for the series/summary

## Suggested JSON shape (chart-data)
```json
{
  "sales_series": [{"date":"2026-02-01","value":12345}, ...],
  "collections_series": [{"date":"2026-02-01","value":9000}, ...],
  "top_routes": [{"route_id":12,"name":"R1","value":12000}],
  "top_reps": [{"rep_id":5,"name":"S. Perera","value":9000}],
  "payment_methods": [{"method":"cash","value":7000},{"method":"card","value":2000}]
}
```

## Frontend
- Page: `Reports/DeliveryAnalytics` (use `recharts` — already used in dashboards)
- Controls: date range, granularity, group_by (route|rep), compare_previous_period toggle
- Interactions: click a route/rep bar to open the detailed Delivery Sales/Collection report filtered by that route/rep

## Backend
- Implement aggregated queries (DB::raw + groupBy date) or use pre-aggregated tables for large datasets
- Reuse logic from `SalesReport` and `CollectionReport` but scoped to `deliveries` only

## Tests
- Unit/Feature: assert `chart-data` returns expected series for seeded data
- Playwright: ensure chart renders and drill-down links work

## Acceptance criteria
- Charts reflect filtered date range
- Drill-down opens the correct report with applied filters
- Chart data endpoint returns compact JSON (suitable for frontend caching)

## Performance
- Cache chart-data for common date ranges (last 7/30/90 days) or use Redis
- Precompute daily aggregates in a scheduled job if dataset is large

---
UX note: show small KPI tiles above charts (Total Sales, Total Collections, Avg Ticket, % Paid) and let users export chart-data as CSV.