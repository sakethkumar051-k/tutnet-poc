import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should show login page with form fields', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should show registration page with role toggle', async ({ page }) => {
        await page.goto('/register');
        await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /student/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /tutor/i })).toBeVisible();
    });

    test('should show validation error for wrong credentials', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel(/email/i).fill('wrong@example.com');
        await page.getByLabel(/password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /sign in/i }).click();

        // Should show an error (either from API or network error)
        await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    });

    test('should navigate from login to register', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('link', { name: /sign up/i }).click();
        await expect(page).toHaveURL('/register');
    });

    test('should navigate from register to login', async ({ page }) => {
        await page.goto('/register');
        await page.getByRole('link', { name: /sign in/i }).click();
        await expect(page).toHaveURL('/login');
    });

    test('should redirect unauthenticated user from dashboard to login', async ({ page }) => {
        await page.goto('/student-dashboard');
        await expect(page).toHaveURL(/\/login/);
    });

    test('should show Google Sign-In button on login', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    });

    test('should validate password match on register', async ({ page }) => {
        await page.goto('/register');
        await page.getByLabel(/full name/i).fill('Test User');
        await page.getByLabel(/email/i).fill('test@example.com');
        await page.getByLabel(/phone/i).fill('+91 9876543210');
        await page.getByLabel(/area/i).fill('Miyapur');
        await page.getByLabel('Password').fill('password123');
        await page.getByLabel('Confirm').fill('different123');
        await page.getByRole('button', { name: /create.*account/i }).click();

        await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });
});
