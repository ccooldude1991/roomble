import { test, expect, type Page } from '@playwright/test';

/** State the game publishes for smoke tests (see scene.ts render()). */
type Telemetry = { score: number; lines: number; level: number; over: boolean } | undefined;

async function telemetry(page: Page): Promise<Telemetry> {
  return page.evaluate(() => (window as unknown as { __stackdown?: Telemetry }).__stackdown);
}

async function startStackdown(page: Page): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/games/stackdown');
  await page.locator('[data-play]').click();
  // First launch always shows the how-to modal; dismiss it fully before playing,
  // otherwise the open <dialog> stays modal and swallows input.
  const howto = page.locator('#howto-modal');
  await expect(howto).toBeVisible();
  await page.locator('[data-howto-done]').click();
  await expect(howto).toBeHidden();
  await expect(page.locator('[data-game-mount] canvas')).toBeVisible({ timeout: 15000 });
  // Wait for the real game (not attract) to publish telemetry.
  await expect.poll(async () => (await telemetry(page)) !== undefined).toBe(true);
  (page as unknown as { __errors: string[] }).__errors = errors;
}

test('Stackdown starts and responds to the keyboard (hard drop scores)', async ({ page }, testInfo) => {
  // Keyboard (DAS/ARR) behaviour isn't viewport-specific; test it once on desktop.
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'keyboard covered on desktop');
  await startStackdown(page);

  // Drive a hard drop each poll iteration so one dropped synthetic event can't
  // fail the test; hard drops award points, so the score must climb above zero.
  await expect
    .poll(
      async () => {
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Space');
        return (await telemetry(page))?.score ?? 0;
      },
      { timeout: 10000 },
    )
    .toBeGreaterThan(0);
});

test('Stackdown responds to a pointer swipe-down hard drop', async ({ page }, testInfo) => {
  // Gesture controls verified once on a phone viewport.
  test.skip(testInfo.project.name !== 'phone-390x844', 'gestures covered on a phone viewport');
  await startStackdown(page);

  const box = await page.locator('[data-game-mount] canvas').boundingBox();
  expect(box).not.toBeNull();
  const cx = box!.x + box!.width / 2;
  const top = box!.y + box!.height * 0.2;

  await expect
    .poll(
      async () => {
        // Quick downward drag = hard drop.
        await page.mouse.move(cx, top);
        await page.mouse.down();
        await page.mouse.move(cx, top + 130, { steps: 3 });
        await page.mouse.up();
        return (await telemetry(page))?.score ?? 0;
      },
      { timeout: 10000 },
    )
    .toBeGreaterThan(0);
});
