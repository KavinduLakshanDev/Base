# Deliveries — flow, architecture & behaviour

A concise technical reference describing how the Deliveries feature works in the current system (backend + frontend), responsibilities, validation, concurrency controls, API endpoints, and troubleshooting.

---

## Table of contents
1. Overview
2. Actors & permissions
3. Models & important fields
4. Controllers & endpoints (behavioural summary)
5. Frontend pages / UX
6. Validation & business rules
7. Transactions, locking & data integrity
8. Edge cases & special behaviour
9. Database / migrations
10. Tests & QA checklist
11. Troubleshooting & common failures
12. API examples
13. Where to look in code (important files)
14. Suggested improvements

---

## 1 — Overview
The Deliveries flow covers:
- Assigning deliveries (create) and editing delivery items
- Tracking delivery status (pending → assigned → delivering → delivered → cancelled)
- Managing delivery routes and assigned sales reps
- Reserving / restoring stock via `stock_in_hand` transactions
- Collecting and recording payments against deliveries (with receipt printing)
- Permissioned management and company scoping

Primary goals: data integrity for stock and payments, clear permissioning, and good UI feedback.

---

## 2 — Actors & permissions
- Roles: `company_admin`, `sales_rep`, etc. (role mapping in seeder).
- Delivery permissions used in code:
  - `deliveries.view`
  - `deliveries.create`
  - `deliveries.edit`
  - `deliveries.delete`
  - `deliveries.update_status`
  - `deliveries.payments.create` (new, for recording payments)
  - `deliveries.payments.delete` (new, for deleting payments)
- Fallback: `deliveries.edit` still authorized for some payment actions to preserve backward compatibility.

---

## 3 — Models & important fields
- `Delivery`
  - Attributes: `id`, `delivery_number`, `company_code`, `status`, `delivery_route_id`, `assigned_user_id`, `delivery_date`, `priority`, `section_id`, `notes`
  - Relations: `items`, `payments`, `deliveryRoute`, `assignedUser`
  - Computed: `outstanding_balance`, `payment_status` (zero-total = `paid`)
- `DeliveryPayment`
  - Fields: `delivery_id`, `amount`, `method`, `reference_no`, `bank_name`, `payment_date`, `notes`, `recorded_by`, `company_code`, `deleted_at`
  - Uses `SoftDeletes`; relation `recordedBy`
- `DeliveryRoute`
  - `name`, `areas`, `is_active`, `company_code`
- `StockInHand` / stock model
  - Transactions are aggregated per `ItemKy`, `section_code`, `batch_no` to compute availability
- `Product`, `Section`
  - Used for product selection and section/batch scoping

---

## 4 — Controllers & endpoints (behavioral summary)
Backend controllers enforce company scoping and permissions, validate input, and use DB transactions for data integrity.

DeliveryController (key actions)
- `GET /deliveries` — `index()`  
  - returns deliveries for `company_code` and uses `withSum('payments', 'amount')` for performance.
- `GET /deliveries/create` — `create()`  
  - prepares routes, sales reps, products, sections.
- `POST /deliveries` — `store()`  
  - validates payload, checks stock availability, writes delivery and adjusts stock inside transaction.
- `GET /deliveries/{delivery}` — `show()`  
  - loads `items` and `payments.recordedBy`.
- `PATCH /deliveries/{delivery}/status` — `updateStatus()`  
  - validates status and permission.
- `PUT /deliveries/{delivery}` — `update()`  
  - validates changes, adjusts stock difference inside transaction.
- `DELETE /deliveries/{delivery}` — `destroy()`  
  - restores stock for items, deletes delivery inside transaction.
- `GET /deliveries/product-batches` — `getProductBatches()`  
  - returns batch-level available quantities (uses `stock_in_hand` aggregation).
- `GET /deliveries/unified-search` — `unifiedSearch()`  
  - product search used by product selection UI.

DeliveryPaymentController (key actions)
- `POST /deliveries/{delivery}/payments` — `store()`  
  - permission check, company check, pre-validate amount vs outstanding, THEN inside `DB::transaction()` re-fetch with `lockForUpdate()` and create payment (prevents over-pay due to races).
- `DELETE /deliveries/{delivery}/payments/{payment}` — `destroy()`  
  - permission + company check, performs soft-delete.
- `GET /deliveries/{delivery}/payments/{payment}/receipt` — `receipt()`  
  - renders printable receipt.

DeliveryRouteController — full CRUD for delivery routes with permission & company checks.

---

## 5 — Frontend pages / UX
Files live in `resources/js/pages/delivery/*`.

- `index.tsx` — deliveries list; uses `payments_sum_amount` to show payment badge and counts.
- `create.tsx` / `edit.tsx` — product selection via `unified-search`, batch lookup via `product-batches`, client-side availability checks, maintain `items` list, submit to backend.
- `show.tsx` — full delivery details, payment collection panel (client posts to `/deliveries/{id}/payments`), list of payments with delete and receipt options.
- Routes pages under `resources/js/pages/delivery/routes/*` — create/edit/index/show routes UI.

Frontend enforces same constraints client-side (minimum checks + friendly messages) but authoritative validation is on the backend.

---

## 6 — Validation & business rules
- Delivery-level validations:
  - Items must include `ItmKy`, `quantity` (numeric > 0), `unit_price` (numeric >= 0).
  - Section must be valid for the company.
- Payment validations (`DeliveryPaymentController@store`):
  - `amount` required, numeric, min 0.01 and must not exceed outstanding (server-checked).
  - `method` in `cash|cheque|transfer`
  - `payment_date` required|date
  - `reference_no`, `bank_name`, `notes` have length caps
- Status values: `pending|assigned|delivering|delivered|cancelled`
- Company scoping: `company_code` must match for delivery/payment/route.

---

## 7 — Transactions, locking & data integrity
- Stock changes (create/update/destroy deliveries) are wrapped in `DB::transaction()` to keep `stock_in_hand` consistent.
- Payments use pessimistic locking:
  - Pre-validate amount, then inside transaction re-load the `Delivery` with `lockForUpdate()` and re-check outstanding before creating `DeliveryPayment`.
  - Prevents concurrent overpayments.
- Payments are `SoftDeletes` and FK uses `restrictOnDelete()` so historical data cannot be removed by deleting a delivery.
- All changes that affect stock or financial totals are done in DB transactions.

---

## 8 — Edge cases & special behaviour
- Zero-total deliveries are treated as **paid** (model logic changed to avoid showing unpaid for no-charge orders).
- Payment deletion is a soft-delete; deleted payments remain auditable.
- Deleting a delivery that has payments is restricted at DB FK level (preventing accidental data loss).
- Company mismatches return `404` to avoid leaking resource existence.
- Old broad permission `deliveries.edit` still grants some payment operations for backward compatibility — new finer-grained permissions were added.

> Important: payment creation and deletion require `deliveries.payments.create` and `deliveries.payments.delete` respectively (or `deliveries.edit` as fallback).

---

## 9 — Database / migrations
- Notable migration: `2026_02_18_210000_update_delivery_payments_softdelete_and_restrict_fk.php`
  - Adds `deleted_at` to `delivery_payments` and changes FK to `restrictOnDelete()`.
- Aggregates used in queries: `withSum('payments', 'amount')` for list performance.

Deployment steps (high level):
- `php artisan migrate --force`
- `php artisan db:seed --class=PermissionSeeder` (if seeding permissions)
- Run delivery-related tests
- `npm run build`

---

## 10 — Tests & QA checklist
- Unit/Feature tests: `tests/Feature/DeliveryPaymentTest.php` (updated for soft-deletes), other delivery tests in `tests/`.
- Smoke tests:
  - Record payment <= outstanding (should succeed).
  - Attempt concurrent payments — verify no overpayment.
  - Delete payment — `deleted_at` set (soft delete).
  - Delete delivery with payments — should be restricted.
  - Delivery with total = 0 should be `paid`.
- Suggested command: `vendor/bin/pest --filter=Delivery`

---

## 11 — Troubleshooting & common failures
- Overpayment reported — confirm DB transaction + `lockForUpdate()` present (payment store flow).
- Negative stock — check stock availability validation in `store()`/`update()` and confirm transactions completed.
- UI shows stale outstanding balance — refresh the delivery detail page (frontend relies on server computed `outstanding_balance`).
- Permission errors — check `PermissionSeeder` and user roles.
- Delivery deletion fails — likely FK restrict; check for existing payments.

---

## 12 — API examples
Create delivery (POST /deliveries)

```json
{
  "customer_name": "Acme Ltd",
  "delivery_route_id": "3",
  "assigned_user_id": "12",
  "delivery_date": "2026-03-01",
  "section_id": "1",
  "items": [
    {
      "ItmKy": 101,
      "batch_no": "BATCH-001",
      "section_code": "SEC-A",
      "ItemCode": "PRD-01",
      "ItemName": "Sample Product",
      "Unit": "pcs",
      "quantity": 2,
      "unit_price": 150.00
    }
  ]
}
```

Record payment (POST /deliveries/{id}/payments)

```json
{
  "amount": 300.00,
  "method": "cash",
  "reference_no": null,
  "bank_name": null,
  "payment_date": "2026-02-19",
  "notes": "Collected by driver"
}
```

---

## 13 — Where to look in code (important files)
- Controllers:
  - `app/Http/Controllers/DeliveryController.php`
  - `app/Http/Controllers/DeliveryPaymentController.php`
  - `app/Http/Controllers/DeliveryRouteController.php`
- Frontend:
  - `resources/js/pages/delivery/index.tsx`
  - `resources/js/pages/delivery/create.tsx`
  - `resources/js/pages/delivery/edit.tsx`
  - `resources/js/pages/delivery/show.tsx`
  - `resources/js/pages/delivery/routes/*`
- Models & migrations:
  - `app/Models/Delivery.php` (payment-status logic)
  - `app/Models/DeliveryPayment.php` (SoftDeletes)
  - `database/migrations/2026_02_18_210000_update_delivery_payments_softdelete_and_restrict_fk.php`
- Tests:
  - `tests/Feature/DeliveryPaymentTest.php`
- Docs:
  - `DELIVERY_PAYMENTS_HARDENING.md` (changes & rationale)

---

## 14 — Suggested improvements / TODO
- Add explicit audit log when a payment is soft-deleted (who/why).
- Expose batch-level reservations (for long-pick flows) to avoid last-minute allocation failures.
- Add optimistic-concurrency token on delivery edits for better UI conflict handling.
- Add automated e2e tests for concurrent payments.

---

> Quick reference: permission names for payments — `deliveries.payments.create`, `deliveries.payments.delete`.

---

If you want, I can:
- Open a PR that adds `DELIVERIES_FLOW.md` to the repo, or
- Update related docs (permission lists / README) to reference this file.

Tell me which next step you prefer.