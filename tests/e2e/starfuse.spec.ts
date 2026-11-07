import { test, expect, type Page } from '@playwright/test';

type Telemetry = { score: number; bestTile: number; over: boolean } | undefined;

async function telemetry(page: Page): Promise<Telemetry> {
  return page.evaluate(() => (window as unknown as { __starfuse?: Telemetry }).__starfuse);
}

async function startStarfuse(page: Page): Promise<void> {
  await page.goto('/games/starfuse');
  await page.locator('[data-play]').click();
  const howto = page.locator('#howto-modal');
  await expect(howto).toBeVisible();
  await page.locator('[data-howto-done]').click();
  await expect(howto).toBeHidden();
  await expect(page.locator('[data-game-mount] canvas')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => (await telemetry(page)) !== undefined).toBe(true);
}

test('Starfuse fuses tiles via the keyboard (score climbs)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'keyboard covered on desktop');
  await startStarfuse(page);

  // Alternate slides; the board fills with matching tiles and fusions score.
  await expect
    .poll(
      async () => {
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowDown');
        return (await telemetry(page))?.score ?? 0;
      },
      { timeout: 12000 },
    )
    .toBeGreaterThan(0);
});

test('Starfuse responds to swipe gestures', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-390x844', 'swipe covered on a phone viewport');
  await startStarfuse(page);

  const box = await page.locator('[data-game-mount] canvas').boundingBox();
  expect(box).not.toBeNull();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;

  await expect
    .poll(
      async () => {
        // swipe left then down
        await page.mouse.move(cx + 60, cy);
        await page.mouse.down();
        await page.mouse.move(cx - 60, cy, { steps: 3 });
        await page.mouse.up();
        await page.mouse.move(cx, cy - 60);
        await page.mouse.down();
        await page.mouse.move(cx, cy + 60, { steps: 3 });
        await page.mouse.up();
        return (await telemetry(page))?.score ?? 0;
      },
      { timeout: 12000 },
    )
    .toBeGreaterThan(0);
});
