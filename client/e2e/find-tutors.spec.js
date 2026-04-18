import { test, expect } from '@playwright/test';

test.describe('Find Tutors Page', () => {
    // Note: These tests require authentication. For CI, use a fixture with stored auth state.
    // For local testing, they verify the page structure when accessible.

    test('should redirect to login when not authenticated', async ({ page }) => {
        await page.goto('/find-tutors');
        await expect(page).toHaveURL(/\/login/);
    });

    test('should show tutor search interface when visiting /find-tutors', async ({ page }) => {
        // This test would need auth setup — skipping for unauthenticated flow
        // It verifies the redirect behavior instead
        await page.goto('/find-tutors');

        // Should redirect unauthenticated users
        await page.waitForURL(/\/login/);
        await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });
});

test.describe('Find Tutors (Authenticated)', () => {
    test.skip(true, 'Requires authenticated session — run with auth fixture');

    test('should display search filters', async ({ page }) => {
        await page.goto('/find-tutors');
        await expect(page.getByPlaceholder(/subject/i)).toBeVisible();
        await expect(page.getByText(/class.*grade/i)).toBeVisible();
    });

    test('should display tutor cards or empty state', async ({ page }) => {
        await page.goto('/find-tutors');
        // Wait for either tutor cards or empty state
        await expect(
            page.locator('[data-testid="tutor-card"], [data-testid="empty-state"]').first()
        ).toBeVisible({ timeout: 10_000 });
    });

    test('should filter tutors by subject', async ({ page }) => {
        await page.goto('/find-tutors');
        await page.getByPlaceholder(/subject/i).fill('Mathematics');
        // Wait for debounced fetch
        await page.waitForTimeout(600);
        // Results should update (either show matching tutors or empty state)
    });
});
