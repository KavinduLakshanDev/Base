# Super Admin Company Switching

## Overview

Super admin users (`user_type = 'super_admin'`) are not tied to any specific company — their `company_code` is `null` in the database. This feature allows a super admin to select which company they want to manage after login, and have all data automatically scoped to that company for the duration of their session.

---

## How It Works

### 1. Login Redirect

`app/Http/Responses/LoginResponse.php` overrides Fortify's default login response. After a successful login, if the authenticated user is a `super_admin`, they are redirected to the company picker instead of the dashboard.

```
POST /login
  → LoginResponse::toResponse()
    → super_admin  → redirect /superadmin/choose-company
    → other users  → redirect /dashboard
```

The custom `LoginResponse` is bound in `app/Providers/FortifyServiceProvider.php`:

```php
$this->app->singleton(LoginResponse::class, \App\Http\Responses\LoginResponse::class);
```

---

### 2. Company Picker Page

**Route**: `GET /superadmin/choose-company` (`superadmin.choose-company`)  
**Controller**: `SuperAdminController::chooseCompany()`  
**View**: `resources/js/pages/superadmin/choose-company.tsx`

Displays all companies as clickable cards. The currently selected company (if any) is highlighted. Clicking a card POSTs `company_code` to the store endpoint.

---

### 3. Storing the Selection

**Route**: `POST /superadmin/choose-company` (`superadmin.store-company`)  
**Controller**: `SuperAdminController::storeCompany()`

Validates that `company_code` exists in the `companies` table, then stores it in the session:

```php
session(['selected_company' => $request->company_code]);
```

Redirects to the dashboard on success.

---

### 4. Data Scoping — ImpersonateCompany Middleware

**File**: `app/Http/Middleware/ImpersonateCompany.php`  
**Registered**: `bootstrap/app.php` → `$middleware->web(append: [...])` (global web stack)

On every web request, if the user is a `super_admin` and `session('selected_company')` is set, the middleware patches the in-memory `User` model instance:

```php
$user->company_code = $selected;                          // e.g. 'VIS001'
$user->section_code = $section->section_code;             // first section for that company
```

> **Important**: These assignments are in-memory only. They are **never saved to the database**. The User model instance is patched for the lifetime of the current request only.

Because all controllers resolve company/section context from `$user->company_code` and `$user->section_code`, they automatically see the chosen company's values without any controller changes.

The `BusinessUnitMiddleware` (route-level) runs after `ImpersonateCompany` (global web-level), so vismass/malibo access checks also see the patched values correctly.

---

### 5. Switching Companies

The sidebar footer shows a **"Switch Company"** button for super admin users. It displays the currently selected company code as a badge, and on click it:

1. POSTs to `POST /superadmin/clear-company` (`superadmin.clear-company`)
2. `SuperAdminController::clearCompany()` forgets `selected_company` from the session
3. Redirects back to the company picker

---

## Routes Summary

| Method | URI | Name | Action |
|--------|-----|------|--------|
| GET | `/superadmin/choose-company` | `superadmin.choose-company` | Show company picker |
| POST | `/superadmin/choose-company` | `superadmin.store-company` | Store chosen company |
| POST | `/superadmin/clear-company` | `superadmin.clear-company` | Clear choice, return to picker |

All three routes are protected by `auth:web` middleware.

---

## Files Changed / Created

| File | Type | Description |
|------|------|-------------|
| `app/Http/Responses/LoginResponse.php` | NEW | Redirects super admin to company picker after login |
| `app/Http/Controllers/SuperAdminController.php` | NEW | Handles company picker, store, and clear endpoints |
| `app/Http/Middleware/ImpersonateCompany.php` | NEW | Patches `company_code` / `section_code` on the user for every request |
| `resources/js/pages/superadmin/choose-company.tsx` | NEW | Company picker UI (Inertia page) |
| `app/Providers/FortifyServiceProvider.php` | MODIFIED | Binds custom `LoginResponse` |
| `bootstrap/app.php` | MODIFIED | Registers `ImpersonateCompany` in the global web middleware stack |
| `routes/web.php` | MODIFIED | Adds the three superadmin routes |
| `app/Http/Middleware/HandleInertiaRequests.php` | MODIFIED | Shares `selected_company` session value as a prop |
| `resources/js/components/app-sidebar.tsx` | MODIFIED | Adds "Switch Company" button for super admin in sidebar footer |

---

## Database Notes

- `users.company_code` is `null` for super admin — this is intentional and must not be changed.
- `sections` table column used for ordering: `id` (not `SecKy` — that column does not exist).
- `section_code` column on `sections` holds the value patched onto `$user->section_code`.

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Super admin visits any page without selecting a company | `company_code` remains `null`; queries may return no results or errors — user should always select a company first |
| Super admin switches from VIS001 to MAL001 | Middleware always overwrites `section_code` with the first section of the new company; stale section from previous selection is never used |
| Non-super-admin user | Middleware does nothing; normal `company_code` / `section_code` from the DB record is used |
| Company has no sections | `section_code` is not patched; controllers dependent on `section_code` may behave unexpectedly |
