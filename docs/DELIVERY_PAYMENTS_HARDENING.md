# Delivery payments — hardening & fixes (2026-02-18)

Quick summary
- ✅ Implemented fixes for race conditions, permission granularity, soft-deletes/audit safety, performance and zero-total handling for delivery payments.
- ✅ All related tests pass (12/12) and frontend build completes successfully.

## What changed (high level) ✅
1. Prevented concurrent overpayment by adding DB transactions + pessimistic locking in the payment store flow.
2. Introduced granular permissions for payments: `deliveries.payments.create` and `deliveries.payments.delete`.
3. Preserved payment audit trail by adding soft-deletes and changing FK to `restrictOnDelete`.
4. Improved list performance by using `withSum('payments', 'amount')` on delivery index.
5. Fixed zero-total deliveries: treated as **paid** (no-charge flows considered paid).
6. Updated tests and frontend to match backend changes.

---

## Files added / changed (concise)
- `app/Models/Delivery.php` — fixed `getPaymentStatusAttribute()` (zero-total => `paid`).
- `app/Models/DeliveryPayment.php` — added `SoftDeletes` trait.
- `app/Http/Controllers/DeliveryPaymentController.php` — wrapped `store()` in `DB::transaction()`, added `lockForUpdate()`, and enforced new payment-specific permission checks; `destroy()` uses payment-delete permission and performs soft-delete.
- `app/Http/Controllers/DeliveryController.php` — `index()` now uses `withSum('payments', 'amount')` instead of eager-loading full payments collection.
- `resources/js/pages/delivery/index.tsx` — reads `payments_sum_amount` and shows payment badge correctly (handles zero-total as `paid`).
- `database/migrations/2026_02_18_210000_update_delivery_payments_softdelete_and_restrict_fk.php` — NEW migration: adds `deleted_at` and changes FK to `restrictOnDelete()`.
- `database/seeders/PermissionSeeder.php` — added `deliveries.payments.create` and `deliveries.payments.delete`; assigned to roles that had delivery perms.
- `tests/Feature/DeliveryPaymentTest.php` — updated assertion for delete to expect soft-delete (`assertSoftDeleted`).

---

## Database / migration details 🔧
- New migration: `2026_02_18_210000_update_delivery_payments_softdelete_and_restrict_fk.php`.
  - Adds `deleted_at` to `delivery_payments` (soft-deletes).
  - Drops existing FK (cascade) and re-adds `restrictOnDelete()` to prevent accidental removal of payment history.

Important: when deploying to production, do **not** rollback/remove payment rows — soft-deletes preserve history.

Commands (deploy):

```bash
php artisan migrate --force
php artisan db:seed --class=PermissionSeeder   # if you need to seed new permissions
vendor/bin/pest --filter=Delivery               # delivery-related tests
npm run build                                   # frontend build
```

Rollback (if necessary):

```bash
php artisan migrate:rollback --step=1
```

> Note: rollback will revert FK behavior and drop `deleted_at` (use with caution).

---

## Permissions added
- `deliveries.payments.create` — record payments
- `deliveries.payments.delete` — delete (soft-delete) payments

Added to `PermissionSeeder` and assigned to roles that previously had delivery privileges (company_admin and other roles configured to manage deliveries).

---

## Behavioural & API changes
- Payment creation (`POST /deliveries/{delivery}/payments`) now:
  - Validates amount against current outstanding balance inside a DB transaction.
  - Uses `lockForUpdate()` to prevent race conditions.
  - Requires `deliveries.payments.create` (or existing `deliveries.edit` as a fallback for roles that still rely on the old permission).
- Payment deletion (`DELETE /deliveries/{delivery}/payments/{id}`) is now a soft-delete and requires `deliveries.payments.delete` (or `deliveries.edit`).
- Delivery list (`GET /deliveries`) no longer loads full `payments` arrays — it returns `payments_sum_amount` for performance.
- Zero-total deliveries are treated as `paid` (display + business logic) to avoid showing `unpaid` for free/no-charge deliveries.

---

## Tests & verification ✅
- `tests/Feature/DeliveryPaymentTest.php` updated and all related tests pass.
- Full delivery-related test suite passed locally (12 tests).
- Frontend build (`npm run build`) completed successfully.

Smoke tests for QA:
- Record a payment <= outstanding balance (should succeed).
- Attempt concurrent payments (should not allow overpay).
- Delete a payment (row should be soft-deleted — `deleted_at` set).
- Delete a delivery that has payments (should be restricted by DB FK).
- Delivery with total = 0 should show `paid` in list and details.

---

## Deployment checklist (recommended)
1. Merge changes to main branch.
2. Backup production DB.
3. Run `php artisan migrate --force`.
4. Run `php artisan db:seed --class=PermissionSeeder` (if you manage permissions via seeder).
5. Run tests: `vendor/bin/pest --filter=Delivery`.
6. Build frontend: `npm run build` and deploy assets.
7. Verify QA smoke-tests in staging before production rollout.

---

## Notes & follow-ups
- Audit trail: soft-deletes preserve payments; consider adding an admin-only "purge" job if long-term retention is required.
- If you prefer `no-charge` as a separate status for zero-total deliveries, we can add it (UI + API) — currently they are treated as `paid` to avoid business confusion.
- Consider an explicit audit log (who deleted payment and why) for deeper finance controls.

---

If you want, I can open a PR with this changelog and the code changes, or add release notes for the deployment. 
