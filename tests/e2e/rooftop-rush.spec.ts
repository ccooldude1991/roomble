import { test, expect, type Page } from '@playwright/test';

type Telemetry = { score: number; metres: number; over: boolean } | undefined;

async function telemetry(page: Page): Promise<Telemetry> {
  return page.evaluate(() => (window as unknown as { __rooftop?: Telemetry }).__rooftop);
}

async function startRooftop(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/games/rooftop-rush');
  await page.locator('[data-play]').click();
  const howto = page.locator('#howto-modal');
  await expect(howto).toBeVisible();
  await page.locator('[data-howto-done]').click();
  await expect(howto).toBeHidden();
  await expect(page.locator('[data-game-mount] canvas')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => (await telemetry(page)) !== undefined).toBe(true);
  return errors;
}

test('Rooftop Rush runs and accrues distance, keyboard input is handled', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'keyboard covered on desktop');
  const errors = await startRooftop(page);

  // The auto-runner covers distance over time.
  await expect.poll(async () => (await telemetry(page))?.metres ?? 0, { timeout: 8000 }).toBeGreaterThan(5);

  // Jump / slide inputs must not throw.
  await page.keyboard.press('Space');
  await page.keyboard.press('Space'); // double jump
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  expect(errors, errors.join(', ')).toEqual([]);
});

test('Rooftop Rush handles touch zones (tap to jump / slide)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-390x844', 'touch zones covered on a phone viewport');
  const errors = await startRooftop(page);

  const box = await page.locator('[data-game-mount] canvas').boundingBox();
  expect(box).not.toBeNull();
  // Tap the right half (jump) and the left half (slide).
  await page.mouse.click(box!.x + box!.width * 0.75, box!.y + box!.height * 0.5);
  await page.mouse.click(box!.x + box!.width * 0.25, box!.y + box!.height * 0.5);

  await expect.poll(async () => (await telemetry(page))?.metres ?? 0, { timeout: 8000 }).toBeGreaterThan(5);
  expect(errors, errors.join(', ')).toEqual([]);
});
