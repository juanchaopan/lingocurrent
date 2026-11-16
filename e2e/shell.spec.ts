import { expect, test } from '@playwright/test';
import { healthSchema } from '../src/shared/contracts/health';

test('workspace and health endpoint are available', async ({ page, request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  expect(healthSchema.parse(await response.json())).toEqual({
    status: 'ok',
    service: 'lingocurrent',
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'LingoCurrent' })).toBeVisible();
  await expect(page.getByText('Read. Collect vocabulary. Practice.')).toBeVisible();
});

test('workspace matches the approved shell baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('workspace.png', { fullPage: true });
});

test('private endpoints reject anonymous access without exposing provider details', async ({
  request,
}) => {
  for (const path of ['/api/v1/me', '/api/v1/articles']) {
    const response = await request.get(path);
    expect([401, 503]).toContain(response.status());
    expect(response.headers()['cache-control']).toContain('no-store');
    const body = await response.text();
    expect(body).not.toMatch(/sk_live_|sk_test_|postgres(?:ql)?:\/\//);
  }
});

test('article links fail closed without Clerk and reject malformed identifiers', async ({
  page,
}) => {
  const response = await page.goto('/articles/not-a-uuid');
  expect(response?.status()).toBe(404);
  await page.goto('/articles/de8f726c-b12e-4b47-9b5a-bec6f473cd05');
  await expect(page.getByRole('heading', { name: 'LingoCurrent' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A small beginning' })).toHaveCount(0);
});
