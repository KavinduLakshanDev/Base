import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Delivery end-to-end flow (vehicle → load → delivery)', () => {
  test.beforeAll(() => {
    console.log('Seeding DB for E2E...');
    // Fresh DB + baseline seeds, then E2E-specific records
    execSync('php artisan migrate:fresh --seed', { stdio: 'inherit' });
    execSync('php artisan db:seed --class=E2ESeeder', { stdio: 'inherit' });
  });

  test('create vehicle, load stock, create delivery using vehicle stock', async ({ page, baseURL }) => {
    if (!baseURL) throw new Error('baseURL is not configured for Playwright');

    // 1) Login as E2E admin
    await page.goto('/login');
    await page.fill('#email', 'e2e_admin@example.com');
    await page.fill('#password', 'password');
    await Promise.all([page.waitForNavigation(), page.click('[data-test="login-button"]')]);

    // 2) Create a vehicle and assign the E2E sales rep
    await page.goto('/deliveries/vehicles/create');
    await page.fill('input[placeholder="e.g. Delivery Van 1"]', 'E2E Vehicle 1');
    await page.fill('input[placeholder="e.g. ABC-1234"]', 'E2E-REG-1');

    // Select sales rep by visible name
    await page.locator('select').filter({ hasText: 'Assigned Sales Rep' }).selectOption({ label: 'E2E Rep' });

    await Promise.all([
      page.waitForNavigation(),
      page.click('button:has-text("Save Vehicle")'),
    ]);

    await expect(page).toHaveURL(/.*\/deliveries\/vehicles$/);
    await expect(page.locator('text=E2E Vehicle 1')).toBeVisible();

    // 3) Open vehicle stock page
    const vehicleRow = page.locator('tr').filter({ hasText: 'E2E Vehicle 1' });
    await vehicleRow.locator('a:has-text("Stock")').click();
    await expect(page).toHaveURL(/.*\/deliveries\/vehicles\/[0-9]+\/stock$/);

    // 4) Load stock into the vehicle (search product + pick batch)
    await page.fill('input[placeholder="Search product..."]', 'E2E Product 1');
    // wait for dropdown and click product
    await page.waitForSelector('text=E2E Product 1');
    await page.click('text=E2E Product 1');

    // select batch (should show E2E-BATCH)
    await page.click('button:has-text("Select batch")');
    await page.click('text=E2E-BATCH');

    await page.fill('input[placeholder="0.00"]', '5');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/deliveries/vehicles') && resp.status() === 200),
      page.click('button:has-text("Load Stock")'),
    ]);

    // confirm stock table shows the product
    await expect(page.locator('text=E2E Product 1')).toBeVisible();

    // 5) Create a delivery using that vehicle and item
    await page.goto('/deliveries/create');

    await page.fill('input[placeholder="e.g., John Smith"]', 'E2E Customer');
    await page.fill('input[placeholder="e.g., +1 (555) 123-4567"]', '+94111234567');
    await page.fill('input[placeholder="e.g., 123 Main Street, City, State, ZIP"]', '100 E2E Street');

    // select delivery route (value contains the route name)
    const routeOption = page.locator('option', { hasText: 'E2E Route' }).first();
    const routeValue = await routeOption.getAttribute('value');
    await page.locator('select').filter({ hasText: 'Delivery Route' }).selectOption(routeValue || '');

    // --- route should filter related selects: vehicle, sales-rep, shop ---
    // vehicle option should be present (vehicle assigned to route's rep)
    await expect(page.locator('select').filter({ hasText: 'Vehicle (optional)' }).locator('option', { hasText: 'E2E Vehicle 1' })).toBeVisible();

    // sales-rep should be auto-selected because E2E Route has exactly one rep in the seeder
    const repOption = page.locator('option', { hasText: 'E2E Rep' }).first();
    const repValue = await repOption.getAttribute('value');
    await expect(page.locator('select').filter({ hasText: 'Sale Representative' })).toHaveValue(repValue || '');

    // shop assigned to the route should be visible in the shop select
    await expect(page.locator('select').filter({ hasText: 'Shop (optional)' }).locator('option', { hasText: 'E2E Shop 1' })).toBeVisible();

    // now select the vehicle (vehicle selection will also set sales-rep if compatible)
    const vehicleOption = page.locator('option', { hasText: 'E2E Vehicle 1' }).first();
    const vehicleValue = await vehicleOption.getAttribute('value');
    await page.locator('select').filter({ hasText: 'Vehicle (optional)' }).selectOption(vehicleValue || '');

    // ensure sales rep remains correctly selected
    await expect(page.locator('select').filter({ hasText: 'Sale Representative' })).toHaveValue(repValue || '');

    // add item to delivery (search + batch + qty + add)
    await page.fill('input[placeholder="Search by Name, Code, or Barcode..."]', 'E2E Product 1');
    await page.waitForSelector('text=E2E Product 1');
    await page.click('text=E2E Product 1');

    // choose batch from the batch dropdown inside add-item card
    await page.click('button:has-text("Select a batch")');
    await page.click('text=E2E-BATCH');

    await page.fill('input[placeholder="0.00"]', '2'); // quantity for add-item (first matching quantity input)
    // ensure unit price exists (second matching input) - leave default

    await page.click('button:has-text("Add Item")');

    // submit the delivery
    await Promise.all([
      page.waitForNavigation(),
      page.click('button:has-text("Assign Delivery")'),
    ]);

    await expect(page).toHaveURL(/.*\/deliveries$/);
    await expect(page.locator('text=E2E Customer')).toBeVisible();

    // --- now verify edit behaviour enforces vehicle-stock filter ---
    // open the delivery record and click edit
    const deliveryRow = page.locator('tr').filter({ hasText: 'E2E Customer' });
    await deliveryRow.locator('a:has-text("Edit")').click();
    await page.waitForNavigation();

    // vehicle should still be selected from before
    await expect(page.locator('select').filter({ hasText: 'Vehicle (optional)' })).toHaveValue(vehicleValue || '');

    // attempt to search for a non‑existent item should show "no products" message
    await page.fill('input[placeholder="Type product code, name, or scan barcode..."]', 'Nonexistent');
    // dropdown should appear and display the no results message
    await page.waitForSelector('text=No products found matching');
  });
});
