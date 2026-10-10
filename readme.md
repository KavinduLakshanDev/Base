# Distribution-system

## End-to-end tests (Playwright) 🔬

Quick instructions to run the new E2E flow (vehicle → load stock → assign delivery):

1. Install Playwright and project deps:
   - npm install
   - npx playwright install

2. Prepare the database for E2E (this runs migrations + seeds):
   - npm run e2e:setup

3. Start the app (in another terminal):
   - php artisan serve --port=8000

4. Run the Playwright test suite:
   - npm run test:e2e

Notes:
- The E2E seeder creates test users/products/routes used by the Playwright test (`e2e_admin@example.com` / `password`).
- If you prefer a headed run for debugging: `npx playwright test --headed`.
