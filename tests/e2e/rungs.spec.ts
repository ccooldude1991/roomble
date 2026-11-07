import { test, expect, type Page } from '@playwright/test';

type Telemetry =
  | {
      number: number;
      par: number;
      steps: number;
      solved: boolean;
      current: string;
      end: string;
      next?: string | null;
    }
  | undefined;

async function telemetry(page: Page): Promise<Telemetry> {
  return page.evaluate(() => (window as unknown as { __rungs?: Telemetry }).__rungs);
}

async function startRungs(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Expose the optimal-next word on the telemetry so the test can climb generically.
  await page.addInitScript(() => {
    (window as unknown as { __rungsTest: boolean }).__rungsTest = true;
  });
  await page.goto('/games/rungs');
  await page.locator('[data-play]').click();
  const howto = page.locator('#howto-modal');
  await expect(howto).toBeVisible();
  await page.locator('[data-howto-done]').click();
  await expect(howto).toBeHidden();
  await expect(page.locator('[data-game-mount] .rungs')).toBeVisible();
  await expect.poll(async () => (await telemetry(page)) !== undefined).toBe(true);
  return errors;
}

test('climbs the daily ladder by typing (keyboard)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'keyboard covered on desktop');
  const errors = await startRungs(page);

  const start = await telemetry(page);
  expect(start?.steps).toBe(0);

  // Walk one optimal rung at a time until the goal word is reached.
  for (let i = 0; i < 12; i++) {
    const t = await telemetry(page);
    if (t?.solved) break;
    const next = t?.next;
    expect(next, 'optimal next word should be exposed under __rungsTest').toBeTruthy();
    await page.keyboard.type(next!);
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await telemetry(page))?.current).toBe(next);
  }

  const done = await telemetry(page);
  expect(done?.solved).toBe(true);
  expect(done?.current).toBe(done?.end);
  // Climbing the optimal path means finishing on par.
  expect(done?.steps).toBe(done?.par);
  // The results overlay appears.
  await expect(page.locator('.rungs__overlay[data-show]')).toBeVisible();
  expect(errors, errors.join(', ')).toEqual([]);
});

test('rejects a non-word without counting it (keyboard)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'keyboard covered on desktop');
  await startRungs(page);
  const t = await telemetry(page);
  // Type a string that is one letter off but almost certainly not a word: the
  // start word with its first letter replaced by 'q' (unless that is the real
  // next word, which the optimal path never is here).
  const start = t!.current;
  const bogus = 'q' + start.slice(1);
  await page.keyboard.type(bogus === t!.next ? 'z' + start.slice(1) : bogus);
  await page.keyboard.press('Enter');
  await expect(page.locator('.rungs__toast[data-show]')).toBeVisible();
  expect((await telemetry(page))?.steps).toBe(0); // not counted
});

test('climbs by tapping the on-screen keyboard (touch viewport)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-390x844', 'pointer covered on a phone viewport');
  const errors = await startRungs(page);

  for (let i = 0; i < 12; i++) {
    const t = await telemetry(page);
    if (t?.solved) break;
    const next = t?.next;
    expect(next, 'optimal next word').toBeTruthy();
    for (const ch of next!) {
      await page.locator(`.rungs__key[data-key="${ch}"]`).click();
    }
    await page.locator('.rungs__key[data-action="enter"]').click();
    await expect.poll(async () => (await telemetry(page))?.current).toBe(next);
  }

  const done = await telemetry(page);
  expect(done?.solved).toBe(true);
  expect(errors, errors.join(', ')).toEqual([]);
});
