import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

// Simple E2E to ensure printer prices update when price type changes.

test.describe('Sales printer price type behavior', () => {
  test.beforeAll(() => {
    console.log('Seeding DB for E2E...');
    execSync('php artisan migrate:fresh --seed', { stdio: 'inherit' });
    execSync('php artisan db:seed --class=E2ESeeder', { stdio: 'inherit' });
  });

  test('adding printer then switching price type updates its price', async ({ page, baseURL }) => {
    if (!baseURL) throw new Error('baseURL is not configured for Playwright');

    // login
    await page.goto('/login');
    await page.fill('#email', 'e2e_admin@example.com');
    await page.fill('#password', 'password');
    await Promise.all([page.waitForNavigation(), page.click('[data-test="login-button"]')]);

    // open new sale form
    await page.goto('/sales/create');

    // switch to printer entry mode
    await page.click('button:has-text("Printer Entry")');
    // ensure price type selector visible
    await expect(page.locator('text=Retail Price (F1)')).toBeVisible();

    // --- scenario A: toggle AFTER adding printer ---
    await page.fill('input[placeholder="Serial Number / Barcode / Item Name"]', 'PRT-001');
    await page.click('button:has-text("Find Printer")');

    const priceCell = page.locator('table td').filter({ hasText: '1000' }).first();
    await expect(priceCell).toBeVisible();

    await page.click('input[name="price_type"][value="wholesale"]');
    const newPriceCell = page.locator('table td').filter({ hasText: '900' }).first();
    await expect(newPriceCell).toBeVisible();

    // remove the printer and test scenario B
    await page.click('button[aria-label="Delete"]');

    // --- scenario B: toggle BEFORE adding printer ---
    await page.click('input[name="price_type"][value="retail"]');
    await page.click('input[name="price_type"][value="wholesale"]');

    await page.fill('input[placeholder="Serial Number / Barcode / Item Name"]', 'PRT-001');
    await page.click('button:has-text("Find Printer")');

    const priceCell2 = page.locator('table td').filter({ hasText: '900' }).first();
    await expect(priceCell2).toBeVisible();

    // switch back to retail for completeness
    await page.click('input[name="price_type"][value="retail"]');
    const priceCell3 = page.locator('table td').filter({ hasText: '1000' }).first();
    await expect(priceCell3).toBeVisible();
  });

  test('editing existing printer sale should update price when switching to wholesale', async ({ page, baseURL }) => {
    if (!baseURL) throw new Error('baseURL is not configured for Playwright');

    // login once more (session persists but just in case)
    await page.goto('/login');
    await page.fill('#email', 'e2e_admin@example.com');
    await page.fill('#password', 'password');
    await Promise.all([page.waitForNavigation(), page.click('[data-test="login-button"]')]);

    // create a sale via the API containing the printer, always retail
    const salePayload = {
      transaction_date: new Date().toISOString().split('T')[0],
      customer_code: '0001',
      customer_name: 'cash',
      price_type: 'retail',
      subtotal: 1000,
      total_amount: 1000,
      is_vat_invoice: false,
      vat_rate: 0,
      discount_amount: 0,
      cash_payment: 1000,
      card_payment: 0,
      points_redeem: 0,
      payment_mode: 'cash',
      items: [
        {
          item_code: 'E2EPRT1',
          item_name: 'E2E Printer',
          unit_price: 1000,
          our_price: 1000,
          cost_price: 0,
          quantity: 1,
          free_quantity: 0,
          total: 1000,
          retail_price: 1000,
          wholesale_price: 900,
          extra_price: 1200,
          itm_ky: null,
          batch_no: null,
          serial_number: 'PRT-001',
          vat_inclusive: false,
        },
      ],
    };

    const createResp = await page.request.post('/sales', { data: salePayload });
    expect(createResp.ok()).toBeTruthy();
    const json = await createResp.json();
    const saleId = json.sale_id;

    // navigate to edit page for that sale
    await page.goto(`/sales/${saleId}/edit`);

    // confirm the row initially shows 1000
    const initialCell = page.locator('table td').filter({ hasText: '1000' }).first();
    await expect(initialCell).toBeVisible();

    // switch to wholesale price type in edit form
    await page.click('input[name="price_type"][value="wholesale"]');

    // price in printers list should update to 900
    const updatedCell = page.locator('table td').filter({ hasText: '900' }).first();
    await expect(updatedCell).toBeVisible();
  });
});
