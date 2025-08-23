/// <reference types="node" />
import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL || 'http://localhost:8000/api';

async function listAllJobIds(request: APIRequestContext): Promise<number[]> {
  const ids: number[] = [];
  let url: string | null = `${API_BASE}/jobs/?page_size=100`;
  while (url) {
    const res = await request.get(url);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const results = (data?.results ?? []) as Array<{ id: number }>;
    ids.push(...results.map(r => r.id));
    url = data?.next ?? null;
  }
  return ids;
}

async function safeDelete(request: APIRequestContext, url: string, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await request.delete(url, { timeout: 5000 });
      if (res.ok()) return;
    } catch (error) {
      if (i === attempts - 1) throw error;
    }
    await new Promise(r => setTimeout(r, 150 * (i + 1))); // Exponential backoff
  }
}

async function resetJobs(request: APIRequestContext) {
  const ids = await listAllJobIds(request);
  console.log(`Deleting ${ids.length} jobs...`);
  
  // Delete in parallel batches to avoid timeout
  const batchSize = 10;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const promises = batch.map(id => 
      safeDelete(request, `${API_BASE}/jobs/${id}/`)
    );
    await Promise.all(promises);
    console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)}`);
  }
}

async function seedJobs(request: APIRequestContext, count: number) {
  for (let i = 0; i < count; i++) {
    const res = await request.post(`${API_BASE}/jobs/`, { data: { name: `E2E Job ${i + 1}` } });
    expect(res.ok()).toBeTruthy();
  }
}

// After deleting a job from page 1 when there is a next page, the page should backfill to PAGE_SIZE and Next remains enabled
// Seed 31 so there are more than one extra page after a single deletion
test('backfills current page after deletion when there is a next page', async ({ page, request }) => {
  await resetJobs(request);
  await seedJobs(request, 31); // 15 + 15 + 1

  await page.goto('/');

  // We should be on Page 1 with Next enabled
  await expect(page.getByText(/Page\s+1/i)).toBeVisible();
  const nextBtn = page.getByRole('button', { name: 'Next' });
  await expect(nextBtn).toBeEnabled();

  // Count job delete buttons (one per job card)
  const deleteButtons = page.getByRole('button', { name: 'delete job' });
  await expect(deleteButtons).toHaveCount(15);

  // Delete one job
  await deleteButtons.first().click();
  await page.waitForLoadState('networkidle');

  // Page should still show 15 jobs (backfilled from next page) and Next remains enabled
  await expect(page.getByRole('button', { name: 'delete job' })).toHaveCount(15);
  await expect(page.getByText(/Page\s+1/i)).toBeVisible();
  await expect(nextBtn).toBeEnabled();
});

// When deleting all jobs on the last page, UI should return to previous page and Next should be disabled (no empty next page)
test('deleting entire last page navigates back and disables Next', async ({ page, request }) => {
  await resetJobs(request);
  await seedJobs(request, 30); // Two full pages

  await page.goto('/');

  // Go to page 2
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/Page\s+2/i)).toBeVisible();

  // Delete all jobs on page 2
  const deleteButtons = page.getByRole('button', { name: 'delete job' });
  const count = await deleteButtons.count();
  for (let i = 0; i < count; i++) {
    await deleteButtons.nth(0).click();
    await page.waitForLoadState('networkidle');
  }

  // Wait until Next becomes disabled and PAGE_SIZE items are visible again (page 1)
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'delete job' })).toHaveCount(15);

  // Should land back on page 1
  await expect(page.getByText(/Page\s+1/i)).toBeVisible();
});
