import { test, expect } from '@playwright/test';

// Helpers
const randomName = () => `Job ${Math.random().toString(36).slice(2, 8)}`;

// Assumes app is running at baseURL (3000) and backend at 8000 via docker-compose
// Critical flow: create job, then update a job status and verify the change

test.describe('Jobs critical flow', () => {
  test('create job and update status', async ({ page }) => {
    await page.goto('/');

    // Create a job
    const name = randomName();
    await page.getByLabel('Enter job name').fill(name);
    const createBtn = page.getByRole('button', { name: 'Create Job' });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // Wait for list to settle and ensure at least one status select is present
    await page.waitForLoadState('networkidle');
    const selectTrigger = page.getByTestId('status-select').first();
    await expect(selectTrigger).toBeVisible();

    // Change status to In Progress via the dropdown menu on the first visible job
    await selectTrigger.click();
    await page.getByRole('option', { name: 'In Progress' }).click();

    // Verify the select now shows In Progress
    await expect(selectTrigger).toHaveText(/In Progress/i);
  });
});
