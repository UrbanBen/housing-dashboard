import { test, expect } from '@playwright/test';

test('admin config form shows priority-based connection system', async ({ page }) => {
  await page.goto('/dashboard');

  // Enable admin mode
  await page.locator('button').filter({ hasText: 'Admin Mode' }).click();

  // Click on the LGA search card specifically (Geography Search)
  await page.locator('.draggable-card').filter({ hasText: 'Geography Search' }).click();

  // Wait for admin form to appear
  await expect(page.locator('text=Configure Data Item')).toBeVisible();

  // Check if API Data Source Connections section is present
  await expect(page.locator('h3:has-text("API Data Source Connections")')).toBeVisible();

  // Check if priority system description is present
  await expect(page.locator('text=Higher priority connections are tried first (1st → 2nd → 3rd)')).toBeVisible();

  // Check if Priority labels are present
  await expect(page.locator('text=1st Priority')).toBeVisible();
  await expect(page.locator('text=2nd Priority')).toBeVisible();
  await expect(page.locator('text=3rd Priority')).toBeVisible();

  // Check if priority badges (numbered circles) are present
  const priorityBadges = page.locator('div:has-text("1"), div:has-text("2"), div:has-text("3")').filter({
    has: page.locator('.rounded-full')
  });
  await expect(priorityBadges).toHaveCount(3);

  // Check if Connection Type dropdowns are present
  await expect(page.locator('select').filter({ hasText: 'API' })).toBeVisible();
  await expect(page.locator('select').filter({ hasText: 'Database' })).toBeVisible();
  await expect(page.locator('select').filter({ hasText: 'External Service' })).toBeVisible();

  // Check if Description fields are present
  await expect(page.locator('input[placeholder*="Brief description"]')).toHaveCount(3);

  // Check if default connection types are set correctly
  await expect(page.locator('text=API Connection').first()).toBeVisible();
  await expect(page.locator('text=Database Connection')).toBeVisible();
  await expect(page.locator('text=External Service Connection')).toBeVisible();

  console.log('✅ Priority-based connection system is working correctly!');
});