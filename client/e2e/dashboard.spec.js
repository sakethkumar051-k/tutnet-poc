import { test, expect } from '@playwright/test';

test.describe('Dashboard Access Control', () => {
    test('should redirect /student-dashboard to login', async ({ page }) => {
        await page.goto('/student-dashboard');
        await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect /tutor-dashboard to login', async ({ page }) => {
        await page.goto('/tutor-dashboard');
        await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect /admin-dashboard to login', async ({ page }) => {
        await page.goto('/admin-dashboard');
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe('Dashboard (Authenticated Student)', () => {
    test.skip(true, 'Requires authenticated session — run with auth fixture');

    test('should display sidebar navigation', async ({ page }) => {
        await page.goto('/student-dashboard');
        await expect(page.getByText(/dashboard/i).first()).toBeVisible();
        await expect(page.getByText(/sessions/i).first()).toBeVisible();
        await expect(page.getByText(/my tutors/i).first()).toBeVisible();
    });

    test('should switch tabs via sidebar', async ({ page }) => {
        await page.goto('/student-dashboard');
        await page.getByText(/sessions/i).first().click();
        await expect(page).toHaveURL(/tab=sessions/);
    });

    test('should show welcome message on dashboard', async ({ page }) => {
        await page.goto('/student-dashboard');
        await expect(page.getByText(/welcome back/i)).toBeVisible();
    });
});

test.describe('Dashboard (Authenticated Tutor)', () => {
    test.skip(true, 'Requires authenticated session — run with auth fixture');

    test('should display tutor-specific tabs', async ({ page }) => {
        await page.goto('/tutor-dashboard');
        await expect(page.getByText(/my students/i).first()).toBeVisible();
        await expect(page.getByText(/schedule/i).first()).toBeVisible();
        await expect(page.getByText(/earnings/i).first()).toBeVisible();
    });
});
