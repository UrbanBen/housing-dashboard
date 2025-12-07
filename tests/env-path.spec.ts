import { test, expect } from '@playwright/test';

test('admin config form accepts .env file path and loads variables', async ({ page }) => {
  await page.goto('/dashboard');

  // Enable admin mode
  await page.locator('button').filter({ hasText: 'Admin Mode' }).click();

  // Click on a card to open admin form
  await page.locator('.draggable-card').first().click();

  // Wait for admin form to appear
  await expect(page.locator('text=Configure Data Item')).toBeVisible();

  // Check if .env File Path field is present
  await expect(page.locator('label:has-text(".env File Path")')).toBeVisible();

  // Enter a file path to our sample .env file
  const envFileInput = page.locator('input[placeholder*="/path/to/your/.env file"]');
  await envFileInput.fill('./sample.env');

  // Wait a moment for the API call to complete
  await page.waitForTimeout(2000);

  // Check if success message appears
  await expect(page.locator('text=Successfully loaded')).toBeVisible();

  // Check if preview variables section appears
  await expect(page.locator('text=Preview variables')).toBeVisible();

  console.log('✅ .env file path functionality working correctly!');
});