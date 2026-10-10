# AI Coding Assistant Instructions

This repository is a Laravel application with an Inertia.js + React frontend in TypeScript.

## Critical database safety rule

Never run `php artisan migrate:fresh` during normal development unless maintainers explicitly ask for it.

Why:
- Most feature tests rely on transactions for speed.
- Rebuilding schema repeatedly is slow and can wipe useful local/shared data.
- Recent fixes assume normal migrate/transaction workflows, not frequent fresh resets.

Use this workflow instead:
- `php artisan migrate`
- `php artisan db:seed` (when needed)
- `npm run e2e:setup` only for isolated E2E preparation

## Architecture overview

1. Backend
- Standard Laravel structure (`app/Http/Controllers`, `app/Models`, `app/Services`, `app/Actions`).
- Keep controllers thin and move business logic to services/actions where practical.
- Inertia responses are common for page endpoints.

2. Frontend
- Inertia React pages live in `resources/js/pages`.
- Shared UI components live under `resources/js/components` (including `components/ui`).
- Styling uses Tailwind plus existing component patterns (Headless UI / Radix / MUI as already used).

3. Routing and URL generation
- Routes are in `routes/web.php` and are often named.
- Use `route()` helpers in PHP/JS; avoid hard-coded URLs.
- If route names change and Ziggy-related issues appear, clear route cache and rebuild frontend assets.

4. Request/state conventions
- Forms generally use `useForm()` from `@inertiajs/react`.
- Non-form AJAX calls typically use `axios` with named routes.

5. Multi-company context
- Respect `company_code` and `section_code` constraints in backend queries and filters.
- Be careful with legacy tables and inconsistent column naming.

## Current stack and tools

- PHP: `^8.2`
- Laravel framework: `^12.0`
- Inertia Laravel: `^2.0`
- Frontend: React + TypeScript + Vite
- Testing: Laravel test runner (`php artisan test`) and Playwright E2E (`npm run test:e2e`)

## Common workflows

- Install deps: `composer install` and `npm install`
- Local app: `php artisan serve` and `npm run dev`
- PHP tests: `php artisan test`
- Type check: `npm run types`
- Lint/format: `npm run lint`, `npm run format`
- Build: `npm run build`
- E2E setup: `npm run e2e:setup` (intended E2E-only reset/seed flow)

## Testing guidance

- Prefer running targeted tests for changed areas first, then broader suites if needed.
- Do not introduce `migrate:fresh` into routine feature-test workflows.
- Follow existing Inertia assertion style in `tests/Feature`.

## Code conventions for this repo

- Reuse existing services/actions/helpers before adding new abstractions.
- Keep behavior consistent across company/section boundaries.
- For legacy tables, verify real column names before querying.
- Keep frontend pages aligned with existing CRUD page patterns (`index/create/edit/show` where applicable).
- Update language files under `resources/lang/{en,si,ta}` when adding user-visible text.

## Important project docs

Read relevant docs under `docs/` before touching those domains. Commonly referenced:
- `docs/AD_HOC_PRINTER_LOGIC.md`
- `docs/CHEQUE_PAYMENT_WORKFLOW.md`
- `docs/CHEQUE_RETURN_AND_PO_REPORT.md`
- `docs/CROSS_COMPANY_TRANSFER_GUIDE.md`
- `docs/CUSTOMER_RETURN_IMPLEMENTATION.md`
- `docs/DELIVERIES_FLOW.md`
- `docs/DELIVERY_PAYMENTS_HARDENING.md`
- `docs/PRINTER_REGISTRATION_AND_GRN_WORKFLOW.md`
- `docs/PRINTER_SECTION_FILTERING.md`
- `docs/PRINTER_STOCK_TRACKING_IMPLEMENTATION.md`
- `docs/PURCHASE_EDIT_PAGE_FIXES.md`
- `docs/ROLES_AND_PERMISSIONS.md`
- `docs/SALES_ITEM_RETURN_IMPLEMENTATION.md`
- `docs/SUPPLIER_PAYMENT_BANK_DEDUCTION_HARDENING.md`
- `docs/UNIT_CONVERSION_SYSTEM_WIDE.md`
- `docs/WASTAGE_STOCK_FIX.md`
- `docs/WASTAGE_STOCK_IN_HAND_FIX.md`

## Practical AI-agent tips

- Search codebase/docs first; there are many domain-specific scripts and references.
- Follow established patterns in nearby files before introducing new structures.
- Keep changes focused and safe; avoid unrelated refactors.
- Validate changes with existing lint/type/test commands when code is modified.
