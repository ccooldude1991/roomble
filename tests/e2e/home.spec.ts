import { test, expect } from '@playwright/test';
import { SITE_NAME } from '../../src/config/site';

test('homepage loads and shows the site name with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');

  await expect(page).toHaveTitle(SITE_NAME);
  await expect(page.getByTestId('site-name')).toHaveText(SITE_NAME);

  expect(errors, `console errors: ${errors.join(', ')}`).toEqual([]);
});
