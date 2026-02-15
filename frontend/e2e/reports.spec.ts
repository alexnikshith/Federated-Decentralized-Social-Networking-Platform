import { test, expect } from '@playwright/test';

test.describe('Reports & Analytics', () => {
    test('should display reports page and tabs', async ({ page }) => {
        // Mock authentication if needed, or assume verified state if dev server allows.
        // Since we don't have login logic reused here, we might need to bypass or login.
        // For now, checking if we can navigate to /reports.
        // If auth is required, this might fail without setup.
        // We'll assume a "bypass" or "mock" is not easily available without more context on auth E2E.
        // If the app redirects to login, we'll assert that.

        await page.goto('/reports');

        // Check if we are title is visible
        // If redirected to login, this will fail. Use conditional.
        // Assume we need to login?
        // Let's check for "Reports" heading.
        await expect(page.getByRole('heading', { level: 1, name: /Reports/i })).toBeVisible({ timeout: 10000 });

        // Check Tabs
        await expect(page.getByText('Time Usage')).toBeVisible();
        await expect(page.getByText('Interactions')).toBeVisible();
        await expect(page.getByText('Posts')).toBeVisible();

        // Click Interactions tab
        await page.getByText('Interactions').click();
        await expect(page.getByText('Interactions Received')).toBeVisible();
    });
});
