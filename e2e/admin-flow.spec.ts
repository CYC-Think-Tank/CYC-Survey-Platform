import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  test('admin login page renders', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByText('Admin Access')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('admin login rejects invalid email domain', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill('person@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText(/Use an email from/)).toBeVisible();
  });

  test('admin login accepts Supabase credentials', async ({ page }) => {
    test.skip(
      !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
      'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this test.'
    );
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Dashboard Overview')).toBeVisible();
  });

  test('admin dashboard has create survey link', async ({ page }) => {
    test.skip(
      !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
      'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this test.'
    );
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('New Survey')).toBeVisible();
  });
});
