import { test, expect } from '@playwright/test';
import { SITE_NAME } from '../../src/config/site';

test('homepage loads, shows the brand and the floor, with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');

  await expect(page).toHaveTitle(new RegExp(SITE_NAME));
  await expect(page.getByRole('link', { name: `${SITE_NAME} home` })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The floor' })).toBeVisible();

  expect(errors, `console errors: ${errors.join(', ')}`).toEqual([]);
});

test('game page template loads and can start the test game', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/games/cabinet-test');

  // Title overlay with Play.
  const play = page.locator('[data-play]');
  await expect(play).toBeVisible();
  await play.click();

  // First launch shows the how-to; dismissing it starts the game and a canvas mounts.
  await page.locator('[data-howto-done]').click();
  await expect(page.locator('[data-game-mount] canvas')).toBeVisible();

  expect(errors, `console errors: ${errors.join(', ')}`).toEqual([]);
});
