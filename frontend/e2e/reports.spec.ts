import { test, expect } from '@playwright/test';

test.describe('Reports & Analytics', () => {
    test('should redirect to login from protected reports page', async ({ page }) => {
        await page.goto('/reports');
        await expect(page).toHaveURL(/.*\/login/);
        await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Password')).toBeVisible();
    });
});
