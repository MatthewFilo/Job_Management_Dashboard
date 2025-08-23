/// <reference types="node" />
import { test, expect, APIRequestContext } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL || 'http://localhost:8000/api';

async function resetJobs(request: APIRequestContext) {
  let url: string | null = `${API_BASE}/jobs/?page_size=100`;
  while (url) {
    const res = await request.get(url);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const ids = (data?.results ?? []).map((r: any) => r.id) as number[];
    for (const id of ids) {
      const del = await request.delete(`${API_BASE}/jobs/${id}/`);
      expect(del.ok()).toBeTruthy();
    }
    url = data?.next ?? null;
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
