# Roles & Permissions — Cross‑Company Transfers

## Purpose ✨
Document the system roles, key permissions (including cross-company stock transfer), seeded demo users, and verification steps. Use this as a quick reference for assigning roles and testing cross-company transfer behavior.

---

## Roles — at a glance

| Role | Slug | Level | Key capabilities | Notes |
|---|---:|---|---|---|
| Super Admin | `super_admin` | super_admin | Full system access | Always allowed by `User::hasPermission()` |
| Company Admin | `company_admin` | company_admin | Full access within their company | **Company admins do NOT need a `section_code`** (changed behavior)
| Sales Representative | `sales_rep` | section_user | Sales, POS, stock transfer, **cross-company transfer** | Has `Cross-Company Stock Transfer` (slug: `stock.cross_company_transfer`) and 24 demo permissions
| Technician | `technician` | section_user | Service / workshop operations, limited stock views | Typical section user
| Cashier | `cashier` | section_user | POS, sale entry, payments | Typical section user

> Note: permission checks use the **permission slug** (see `User::hasPermission($slug)`) — e.g. `stock.cross_company_transfer`.

---

## Sales Representative — important details ✅
- Role slug: `sales_rep`
- Demo permissions: 24 (includes viewing products, creating sales/quotations, POS access, `Transfer Stock`, and `Cross-Company Stock Transfer`).
- Cross-company permission slug: `stock.cross_company_transfer` (use this slug in code checks).
- Typical use: sales reps can initiate transfers between sections that belong to different companies (e.g., VISMASS → MALIBO).

Full permission set for `sales_rep` (demo):
- View Products, View Categories, View Brands, View Models, View Units
- View Customers, Create Customers, Edit Customers
- Create Sales, View Sales, View Sales Reports
- Create Quotations, View Quotations, Edit Quotations
- POS Access, Create Customer Payments, View Customer Payments
- View Stock, View Stock In Hand, View Stock Reports, View Bin Card
- Transfer Stock
- Cross-Company Stock Transfer
- View Customer History

---

## Seeded demo users (current workspace seed) 👥

| Email | Role | Company | Section | Default password |
|---|---|---:|---:|---|
| `vismass@example.com` | Company Admin | `VIS001` | None | `password` |
| `malibo@example.com` | Company Admin | `MAL001` | None | `password` |
| `admin.malibo@example.com` | Company Admin | `MAL001` | `MAL-SEC-001` | `password` |
| `salesrep.malibo@example.com` | Sales Representative | `MAL001` | `MAL-SEC-001` | `password` |
| `cashier1.vismass@example.com` | Cashier | `VIS001` | `VIS-SEC-002` | `password` |
| `tech1.vismass@example.com` | Technician | `VIS001` | `VIS-SEC-001` | `password` |

> These are seeded for development/testing only — change passwords in staging/production.

---

## How to seed / assign roles 🔧
- Seed roles & permissions:

```
php artisan db:seed --class=Database\\Seeders\\RoleSeeder
php artisan db:seed --class=Database\\Seeders\\PermissionSeeder
php artisan db:seed --class=Database\\Seeders\\UsersSeeder
```

- Assign a role to an existing user (Eloquent / Tinker example):

```
php artisan tinker
>>> $user = App\\Models\\User::where('email','joe@example.com')->first();
>>> $role = App\\Models\\Role::where('slug','sales_rep')->first();
>>> $user->role_id = $role->id; $user->save();
```

- Check permission in code (use slug):

```php
if ($user->hasPermission('stock.cross_company_transfer')) {
    // allowed
}
```

---

## Testing cross-company transfer (quick checklist) ✔️
1. Log in as `salesrep.malibo@example.com` (or another user with `sales_rep`).
2. Create a stock transfer from a VISMASS section (e.g. `VIS-SEC-002`) to a MALIBO section (e.g. `MAL-SEC-001`).
3. Verify the receiving side sees `item_name`/`ItemCode` in transfer history (fallback stored on transfer record).
4. Confirm `stock_in_hand.owner_company_code` is preserved (ownership preserved on transfer).
5. Check logs for the audit entry `Cross-company transfer initiated`.

---

## Important notes & gotchas ⚠️
- The system checks permission by **slug** (not display name). Use `stock.cross_company_transfer` in conditionals.
- `company_admin` users implicitly pass `hasPermission()` checks — they are considered full-company admins.
- Company admins no longer require `section_code` — they should be created/seeded with `section_code = null`.
- Always seed roles/permissions after updating `PermissionSeeder` or `RoleSeeder`.

---

## Where the implementation lives (files changed)
- `database/seeders/RoleSeeder.php` (added `sales_rep` role)
- `database/seeders/PermissionSeeder.php` (added/assigned cross-company permission)
- `database/seeders/UsersSeeder.php` (company-admin adjustments + `salesrep.malibo`)
- `app/Http/Controllers/StockTransferController.php` (permission + cross-company logic)
- Migrations:
  - `2026_02_17_000000_add_item_details_to_stock_transfers_table.php`
  - `2026_02_17_100000_add_owner_company_to_stock_in_hand.php`
  - `2026_02_17_100001_add_cross_company_transfer_permission.php`

---

## Next steps / recommendations 💡
- Assign `sales_rep` to real users who need cross-company transfer rights.
- Run integration tests for transfer flows between companies.
- Audit logs in production after deployment for any unexpected cross‑company transfers.

---

If you want, I can: add this file to the repo (done), create a short PR, or generate a one-page test plan for QA. Which do you prefer next?