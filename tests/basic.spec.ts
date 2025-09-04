import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/');
  
  // Check that the main heading is visible
  await expect(page.getByRole('heading', { name: 'Housing Insights Dashboard' })).toBeVisible();
  
  // Check that the description is present
  await expect(page.getByText('Advanced housing market analytics platform')).toBeVisible();
  
  // Check that the View Dashboard button is present
  await expect(page.getByRole('link', { name: 'View Analytics Dashboard' })).toBeVisible();
  
  // Check the three feature cards are present
  await expect(page.getByRole('heading', { name: 'Trend Analysis' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Market Intelligence' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Public Accessibility' })).toBeVisible();
});

test('dashboard navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Click the View Analytics Dashboard button
  await page.getByRole('link', { name: 'View Analytics Dashboard' }).click();
  
  // Should navigate to dashboard page
  await expect(page).toHaveURL('/dashboard');
  
  // Check that dashboard content loads
  await expect(page.getByRole('heading', { name: 'Housing Market Analytics' })).toBeVisible();
  await expect(page.getByText('Median Home Price', { exact: true }).first()).toBeVisible();
});