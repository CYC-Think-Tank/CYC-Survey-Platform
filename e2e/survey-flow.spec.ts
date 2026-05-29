import { test, expect } from '@playwright/test';

test.describe('Survey Flow', () => {
  test('user can view and start a survey', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CYC Survey Platform/);
    await page.waitForTimeout(2000);
    const startButton = page.getByText('START NOW').first();
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
      await expect(page).toHaveURL(/\/surveys|survey/);
    }
  });

  test('landing page has key elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Make Your Voice')).toBeVisible();
    await expect(page.getByText('Heard.')).toBeVisible();
    await expect(page.getByText('START NOW')).toBeVisible();
  });

  test('survey page shows not found for invalid ID', async ({ page }) => {
    await page.goto('/survey/invalid-id-12345');
    await expect(page.getByText(/not found|unavailable/i)).toBeVisible();
  });
});
