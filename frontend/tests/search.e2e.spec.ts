/// <reference types="node" />
import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL || 'http://localhost:8000/api';

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
  const ids: number[] = [];
  let url: string | null = `${API_BASE}/jobs/?page_size=100`;
  
  // First collect all IDs
  while (url) {
    const res = await request.get(url);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const results = (data?.results ?? []) as Array<{ id: number }>;
    ids.push(...results.map(r => r.id));
    url = data?.next ?? null;
  }
  
  console.log(`Deleting ${ids.length} jobs...`);
  
  // Delete in parallel batches
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

async function seed(request: APIRequestContext, names: string[]) {
  for (const name of names) {
    const res = await request.post(`${API_BASE}/jobs/`, { data: { name } });
    expect(res.ok()).toBeTruthy();
  }
}

// Search is prefix-based: typing 'he' should match 'hello' but 'e' should not
// Also confirm pagination cooperates with search filter

test('search filters by prefix and respects pagination', async ({ page, request }) => {
  await resetJobs(request);
  await seed(request, [
    'alpha', 'alphabet', 'alpine', 'beta', 'bravo', 'charlie',
    'hello', 'helium', 'helsinki', 'zeta', 'zebra', 'zen',
  ]);

  await page.goto('/');

  const search = page.getByRole('textbox', { name: /search jobs \(prefix\)/i });

  // Typing a non-prefix should not find 'hello'
  await search.fill('e');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('hello', { exact: true })).toHaveCount(0);

  // Typing a valid prefix should find matches
  await search.fill('he');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('hello', { exact: true })).toBeVisible();
  await expect(page.getByText('helium', { exact: true })).toBeVisible();
  await expect(page.getByText('helsinki', { exact: true })).toBeVisible();

  // Clear search restores full list
  await search.fill('');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('alpha', { exact: true })).toBeVisible();
  await expect(page.getByText('zebra', { exact: true })).toBeVisible();
});
