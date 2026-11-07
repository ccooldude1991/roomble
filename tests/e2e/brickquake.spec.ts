import { test, expect, type Page } from '@playwright/test';

type Telemetry = { score: number; lives: number; stage: number; over: boolean } | undefined;

async function telemetry(page: Page): Promise<Telemetry> {
  return page.evaluate(() => (window as unknown as { __brickquake?: Telemetry }).__brickquake);
}

async function startBrickquake(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/games/brickquake');
  await page.locator('[data-play]').click();
  const howto = page.locator('#howto-modal');
  await expect(howto).toBeVisible();
  await page.locator('[data-howto-done]').click();
  await expect(howto).toBeHidden();
  await expect(page.locator('[data-game-mount] canvas')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => (await telemetry(page)) !== undefined).toBe(true);
  return errors;
}

test('Brickquake launches the ball and breaks bricks (keyboard)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'keyboard covered on desktop');
  const errors = await startBrickquake(page);

  // Launch (press each iteration so a dropped event can't fail it) and keep the
  // paddle rallying; the ball breaks bricks and the score climbs.
  await expect
    .poll(
      async () => {
        await page.keyboard.press('Space');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowRight');
        return (await telemetry(page))?.score ?? 0;
      },
      { timeout: 20000 },
    )
    .toBeGreaterThan(0);
  expect(errors, errors.join(', ')).toEqual([]);
});

test('Brickquake moves the paddle and launches via pointer (touch viewport)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-390x844', 'pointer covered on a phone viewport');
  const errors = await startBrickquake(page);

  const box = await page.locator('[data-game-mount] canvas').boundingBox();
  expect(box).not.toBeNull();
  // Drag in the lower area, then tap to launch.
  await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.9);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.9, { steps: 3 });
  await page.mouse.up();
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.8);

  await expect
    .poll(async () => (await telemetry(page))?.score ?? 0, { timeout: 15000 })
    .toBeGreaterThan(0);
  expect(errors, errors.join(', ')).toEqual([]);
});
