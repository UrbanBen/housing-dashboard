import { test, expect } from '@playwright/test';

test('admin mode form opens when clicking cards', async ({ page }) => {
  await page.goto('/dashboard');

  // Enable admin mode
  await page.locator('button').filter({ hasText: 'Admin Mode' }).click();

  // Verify admin mode is active
  await expect(page.getByText('Admin Mode - Click any card')).toBeVisible();

  // Click on first card
  await page.locator('.draggable-card').first().click();

  // Check if admin form appeared
  await expect(page.locator('text=Configure Data Item')).toBeVisible({ timeout: 5000 });

  console.log('✅ Admin configuration form opened successfully!');
});