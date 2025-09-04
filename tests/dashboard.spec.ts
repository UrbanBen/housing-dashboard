import { test, expect } from '@playwright/test';

test('dashboard displays properly with all components', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Check navigation bar
  await expect(page.getByText('Housing Analytics')).toBeVisible();
  await expect(page.getByText('LIVE DATA')).toBeVisible();
  
  // Check main header
  await expect(page.getByRole('heading', { name: 'Housing Market Analytics' })).toBeVisible();
  
  // Check all KPI cards are visible
  await expect(page.getByText('Median Home Price').first()).toBeVisible();
  await expect(page.getByText('$485,200')).toBeVisible();
  await expect(page.getByText('Market Velocity')).toBeVisible();
  await expect(page.getByText('18 days')).toBeVisible();
  await expect(page.getByText('Housing Inventory')).toBeVisible();
  await expect(page.getByText('2,847')).toBeVisible();
  await expect(page.getByText('Price-to-Income Ratio')).toBeVisible();
  await expect(page.getByText('4.2x')).toBeVisible();
  
  // Check chart sections
  await expect(page.getByText('Housing Price Trends')).toBeVisible();
  await expect(page.getByText('Market Overview')).toBeVisible();
  
  // Check additional analytics sections
  await expect(page.getByRole('heading', { name: 'Market Forecast' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Regional Comparison' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Data Freshness' })).toBeVisible();
  
  // Check forecast data
  await expect(page.getByText('Next Quarter')).toBeVisible();
  await expect(page.getByText('+3.2%')).toBeVisible();
  await expect(page.getByText('Confidence Level')).toBeVisible();
  await expect(page.getByText('85%')).toBeVisible();
  
  // Check status indicators
  await expect(page.getByText('Real-time')).toBeVisible();
  await expect(page.getByText('Daily')).toBeVisible();
  await expect(page.getByText('Weekly')).toBeVisible();
  
  // Check footer
  await expect(page.getByText('Data sources: Multiple MLS feeds')).toBeVisible();
});

test('dashboard is responsive', async ({ page }) => {
  // Test desktop view
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Housing Market Analytics' })).toBeVisible();
  
  // Test tablet view
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole('heading', { name: 'Housing Market Analytics' })).toBeVisible();
  
  // Test mobile view
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.getByRole('heading', { name: 'Housing Market Analytics' })).toBeVisible();
});