import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  test('admin login page renders', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByText('Admin Access')).toBeVisible();
    await expect(page.getByLabel('Master Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Access Dashboard' })).toBeVisible();
  });

  test('admin login rejects wrong password', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Master Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Access Dashboard' }).click();
    await expect(page.getByText('Incorrect password.')).toBeVisible();
  });

  test('admin login accepts correct password', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Master Password').fill('cycsurveyplatformadmin');
    await page.getByRole('button', { name: 'Access Dashboard' }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Dashboard Overview')).toBeVisible();
  });

  test('admin dashboard has create survey link', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Master Password').fill('cycsurveyplatformadmin');
    await page.getByRole('button', { name: 'Access Dashboard' }).click();
    await expect(page.getByText('New Survey')).toBeVisible();
  });
});
