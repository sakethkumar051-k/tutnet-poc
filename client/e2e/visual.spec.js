import { test, expect } from '@playwright/test';

/**
 * Visual regression tests — capture screenshots for comparison.
 * Run `npm run test:visual` to update baseline snapshots.
 * Subsequent runs compare against baselines and fail on diff.
 */

test.describe('Visual Regression — Public Pages', () => {
    test('home page', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('home.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.05,
        });
    });

    test('login page', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('login.png', {
            maxDiffPixelRatio: 0.05,
        });
    });

    test('register page — student', async ({ page }) => {
        await page.goto('/register');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('register-student.png', {
            maxDiffPixelRatio: 0.05,
        });
    });

    test('register page — tutor', async ({ page }) => {
        await page.goto('/register');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /tutor/i }).click();
        await expect(page).toHaveScreenshot('register-tutor.png', {
            maxDiffPixelRatio: 0.05,
        });
    });
});

test.describe('Visual Regression — Mobile', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('home page mobile', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('home-mobile.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.05,
        });
    });

    test('login page mobile', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('login-mobile.png', {
            maxDiffPixelRatio: 0.05,
        });
    });
});
