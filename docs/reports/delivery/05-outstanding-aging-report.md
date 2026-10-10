# Delivery — Outstanding / Aging Report

## Purpose ✅
Show outstanding balances on deliveries broken into aging buckets (0–30, 31–60, 61–90 days). Deliveries in the 61–90 bucket that remain unpaid must be visually flagged (red) because they were expected to be cleared in the previous period.

## Models / Fields
- Delivery (delivery_date, total_amount via items, `outstanding_balance` accessor)
- DeliveryPayment (payment_date, amount)
- Shop / Customer

## Buckets
- Current age = DATEDIFF(CURDATE(), delivery_date)
- Buckets: 0–30, 31–60, 61–90 (optionally >90)
- A delivery appears in bucket X when age ∈ X and outstanding_balance > 0

## Special rule
- 61–90: mark as `overdue-critical` (red) when outstanding_balance > 0
  - UI should show red row or red outstanding cell and provide quick action (create payment)

## Filters
- date_from / date_to (delivery date window; default last 90 days)
- bucket (0-30|31-60|61-90|all)
- rep_id, route_id, shop_id
- min_outstanding_threshold

## UI / UX
- Page: `Reports/DeliveryOutstandingAging`
- Table columns: Customer | Delivery # | Delivery Date | Days | Bucket | Outstanding (Rs.) | Last Payment Date | Sales Rep | Route
- Rows in 61–90 with outstanding > 0: highlighted red; `Send reminder` and `Add payment` CTAs are implemented.
  - `Send reminder` posts to `POST /reports/delivery-outstanding/{delivery}/send-reminder` (uses `SmsService` to send SMS when `customer_phone` exists).
  - `Add payment` navigates to the delivery page where payments can be recorded (`/deliveries/{id}`).
- Summary at top: total outstanding, bucket totals, % overdue
- CSV export with colorless numeric values but include `bucket` column

## Backend (Eloquent / SQL)
Conceptual query:
```sql
SELECT d.id, d.delivery_number, d.delivery_date, (d.total_amount - IFNULL(p.paid,0)) as outstanding,
       DATEDIFF(CURDATE(), d.delivery_date) as age_days,
       CASE WHEN age_days <= 30 THEN '0-30'
            WHEN age_days <= 60 THEN '31-60'
            WHEN age_days <= 90 THEN '61-90'
            ELSE '>90' END as bucket
FROM deliveries d
LEFT JOIN (
  SELECT delivery_id, SUM(amount) as paid FROM delivery_payments WHERE deleted_at IS NULL GROUP BY delivery_id
) p ON p.delivery_id = d.id
WHERE d.company_code = :company AND d.delivery_date BETWEEN :from AND :to
HAVING outstanding > 0
```

## Tests
- PHPUnit: seed deliveries with different dates/payments → assert bucket classification and outstanding totals
- Playwright: filter for `61-90` and confirm red highlight for unpaid entries; test `Send reminder` CTA if implemented

## Acceptance criteria
- All deliveries with outstanding_balance > 0 are present in correct bucket
- 61–90 unpaid items are visually flagged red in UI
- CSV export contains `bucket` and `outstanding` numeric values

## Notes & validation
- Aging is based on `delivery_date` (not last payment date)
- Optionally add aging by last activity or invoice due date if available
- Consider an alert job for repeated overdue (61–90) entries

---
UX tip: add quick filters to surface only `critical overdue` (>60 days & outstanding) and bulk reminder/collection actions.