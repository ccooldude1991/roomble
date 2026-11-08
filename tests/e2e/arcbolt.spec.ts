import { test, expect, type Page } from '@playwright/test';

interface Telemetry {
  score: number;
  wave: number;
  hull: number;
  over: boolean;
  phase: string;
  enemies: number;
  bullets: number;
  particles: number;
  touch: { left: boolean; right: boolean };
  pools: { bullets: number; enemies: number; particles: number; ebullets: number; pickups: number };
}

async function telemetry(page: Page): Promise<Telemetry | undefined> {
  return page.evaluate(() => (window as unknown as { __arcbolt?: Telemetry }).__arcbolt);
}

async function startArcbolt(
  page: Page,
  opts: { aimbot?: boolean; forceTouch?: boolean } = {},
): Promise<string[]> {
  const aimbot = opts.aimbot ?? true;
  const forceTouch = opts.forceTouch ?? false;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // aimbot: auto-aim + auto-fire so the smoke test can verify the kill/score
  // pipeline without pixel-perfect aiming. forceTouch: exercise the twin-stick path.
  await page.addInitScript(
    (o) => {
      const w = window as unknown as { __arcboltTest?: boolean; __arcboltForceTouch?: boolean };
      if (o.aimbot) w.__arcboltTest = true;
      if (o.forceTouch) w.__arcboltForceTouch = true;
    },
    { aimbot, forceTouch },
  );
  await page.goto('/games/arcbolt');
  await page.locator('[data-play]').click();
  const howto = page.locator('#howto-modal');
  await expect(howto).toBeVisible();
  await page.locator('[data-howto-done]').click();
  await expect(howto).toBeHidden();
  await expect(page.locator('[data-game-mount] canvas')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => (await telemetry(page)) !== undefined).toBe(true);
  return errors;
}

test('Arcbolt clears enemies and the score climbs (keyboard)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'keyboard covered on desktop');
  const errors = await startArcbolt(page);

  // Move around while the test auto-aim + auto-fire does its work.
  await expect
    .poll(
      async () => {
        await page.keyboard.press('KeyW');
        await page.keyboard.press('KeyD');
        return (await telemetry(page))?.score ?? 0;
      },
      { timeout: 20000 },
    )
    .toBeGreaterThan(0);

  const t = await telemetry(page);
  expect(t?.bullets).toBeGreaterThan(0); // firing
  expect(errors, errors.join(', ')).toEqual([]);
});

test('Arcbolt twin-stick touch: right stick aims+fires, left stick moves (touch viewport)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-390x844', 'touch covered on a phone viewport');
  // Arcbolt is a landscape game — use a landscape phone so the rotate prompt is not
  // shown. Force the twin-stick path; no aimbot, so firing comes from the stick.
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = await startArcbolt(page, { aimbot: false, forceTouch: true });

  const box = (await page.locator('[data-game-mount] canvas').boundingBox())!;
  expect(box).not.toBeNull();

  // Right thumb: press-and-drag on the right half → aim + auto-fire.
  const rx = box.x + box.width * 0.75;
  const ry = box.y + box.height * 0.6;
  await page.mouse.move(rx, ry);
  await page.mouse.down();
  await page.mouse.move(rx + 30, ry - 20, { steps: 4 });
  await expect.poll(async () => (await telemetry(page))?.touch.right).toBe(true);
  await expect
    .poll(async () => (await telemetry(page))?.bullets ?? 0, { timeout: 15000 })
    .toBeGreaterThan(0);
  await page.mouse.up();

  // Left thumb: press-and-drag on the left half → movement stick.
  const lx = box.x + box.width * 0.2;
  const ly = box.y + box.height * 0.7;
  await page.mouse.move(lx, ly);
  await page.mouse.down();
  await page.mouse.move(lx + 28, ly, { steps: 4 });
  await expect.poll(async () => (await telemetry(page))?.touch.left).toBe(true);
  await page.mouse.up();

  expect(errors, errors.join(', ')).toEqual([]);
});

test('Arcbolt pools do not grow across runs (fixed capacity)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'runs once on desktop');
  await startArcbolt(page);

  const first = await telemetry(page);
  const caps = JSON.stringify(first?.pools);

  // Let it run and fire for a while, then confirm active counts never exceed caps
  // and the pool capacities are unchanged.
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('KeyA');
    await page.keyboard.press('KeyS');
    const t = await telemetry(page);
    if (!t) continue;
    expect(t.bullets).toBeLessThanOrEqual(t.pools.bullets);
    expect(t.enemies).toBeLessThanOrEqual(t.pools.enemies);
    expect(t.particles).toBeLessThanOrEqual(t.pools.particles);
  }
  const last = await telemetry(page);
  expect(JSON.stringify(last?.pools)).toBe(caps); // capacities constant
});
