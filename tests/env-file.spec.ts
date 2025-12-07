import { test, expect } from '@playwright/test';
import path from 'path';

test('admin config form can load .env file for password', async ({ page }) => {
  await page.goto('/dashboard');

  // Enable admin mode
  await page.locator('button').filter({ hasText: 'Admin Mode' }).click();

  // Click on a card to open admin form
  await page.locator('.draggable-card').first().click();

  // Wait for admin form to appear
  await expect(page.locator('text=Configure Data Item')).toBeVisible();

  // Check if Load .env button is present
  await expect(page.locator('label:has-text("Load .env")')).toBeVisible();

  // Get the path to our sample .env file
  const envFilePath = path.join(__dirname, '..', 'sample.env');

  // Upload the .env file
  await page.setInputFiles('#env-file-input', envFilePath);

  // Check if file name appears
  await expect(page.locator('text=sample.env')).toBeVisible();

  // Check if password variables are detected and displayed
  await expect(page.locator('text=Select password variable:')).toBeVisible();
  await expect(page.locator('.bg-purple-100', { hasText: 'DB_PASSWORD' })).toBeVisible();

  // Click on DB_PASSWORD to select it (use the purple button in the password section)
  await page.locator('.bg-purple-100', { hasText: 'DB_PASSWORD' }).click();

  // Verify the password field is populated (we can't see the value directly due to type="password")
  // But we can check that the field is no longer empty by checking if a save would work
  const passwordField = page.locator('input[type="password"]');
  await expect(passwordField).not.toHaveValue('');

  console.log('✅ .env file functionality working correctly!');
});