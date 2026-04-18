import { test, expect } from '@playwright/test';

test.describe('Navigation & Public Pages', () => {
    test('should load home page', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/tutnet|vite/i);
        // Navbar should be visible
        await expect(page.locator('nav')).toBeVisible();
    });

    test('should navigate between public pages', async ({ page }) => {
        await page.goto('/');

        // Check navbar links
        const homeLink = page.getByRole('link', { name: /home/i }).first();
        await expect(homeLink).toBeVisible();
    });

    test('should show login and signup buttons for unauthenticated users', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
    });

    test('should have responsive mobile menu button', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/');

        // Mobile hamburger should appear
        await expect(page.getByLabel(/toggle menu/i)).toBeVisible();
    });

    test('should show footer with contact info', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByText(/support@tutnet\.com/i)).toBeVisible();
    });
});
