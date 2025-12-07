import { test, expect } from '@playwright/test';

test('admin config form shows API connections configuration', async ({ page }) => {
  await page.goto('/dashboard');

  // Enable admin mode
  await page.locator('button').filter({ hasText: 'Admin Mode' }).click();

  // Click on the LGA search card specifically (Geography Search)
  await page.locator('.draggable-card').filter({ hasText: 'Geography Search' }).click();

  // Wait for admin form to appear
  await expect(page.locator('text=Configure Data Item')).toBeVisible();

  // Check if API Data Source Connections section is present
  await expect(page.locator('h3:has-text("API Data Source Connections")')).toBeVisible();

  // Check if Primary Connection is present
  await expect(page.locator('text=Primary Connection')).toBeVisible();

  // Check if Fallback connections are present
  await expect(page.locator('text=Fallback 1 Connection')).toBeVisible();
  await expect(page.locator('text=Fallback 2 Connection')).toBeVisible();

  // Check if default API endpoints are populated
  await expect(page.locator('input[value*="/api/arcgis-lga"]')).toBeVisible();
  await expect(page.locator('input[value*="/api/abs-census-lga"]')).toBeVisible();
  await expect(page.locator('input[value*="/api/nsw-boundaries"]')).toBeVisible();

  // Check if Test buttons are present
  await expect(page.locator('button:has-text("Test")')).toHaveCount(3);

  // Check if Test All button is present
  await expect(page.locator('button:has-text("Test All Enabled Connections")')).toBeVisible();

  console.log('✅ API connections configuration UI is working correctly!');
});