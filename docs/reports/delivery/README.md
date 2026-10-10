# Delivery — Reports (specs)

This folder contains specification and implementation guidance for delivery-focused reports requested by the product owner.

Included reports (one file per spec):

1. `01-sales-report.md` — Delivery sales (route-wise / rep-wise) — daily & arbitrary range
2. `02-collection-report.md` — Collections by payment method, rep-wise comparison
3. `03-fast-slow-moving-items.md` — Fast / slow moving items (route & rep)
4. `04-profit-calculation-report.md` — Profit = (unit_price - cost_price) * qty (filters: rep, route)
5. `05-outstanding-aging-report.md` — Aging buckets (0-30, 31-60, 61-90) + overdue highlighting
6. `06-graph-analysis-report.md` — Time-series & performance charts (sales, collections, top route/rep)

How to use these specs
- Follow patterns used in `DeliverySummaryReportController` and `resources/js/pages/Reports/*`.
- Add controller(s) under `app/Http/Controllers/Reports/` and page(s) under `resources/js/pages/Reports/`.
- Routes: add `reports/delivery-*` entries in `routes/web.php` and guard with `deliveries.view` permission.
- Tests: add PHPUnit feature tests (use Inertia assertions) + Playwright E2E for UI + CSV validation.

Priority implementation order (recommended):
1. Sales report (foundation) ✅
2. Collection report
3. Outstanding (aging) report
4. Profit report
5. Fast/slow moving items
6. Graph analysis (visuals & combined metrics)

Performance notes
- Index suggestions: `deliveries.company_code`, `deliveries.delivery_date`, `deliveries.delivery_route_id`, `delivery_items.ItmKy`, `delivery_payments.payment_date`.
- For large datasets add pre-aggregated daily tables or scheduled jobs for analytics.

If you want, I can: implement the controllers + Inertia pages + tests and add Playwright coverage — tell me which report to start with first.