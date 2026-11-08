/*
 * Shared helpers for the DEV-ONLY capture harness (see capture/[slug].astro and
 * capture/og/[slug].astro). Files under src/pages prefixed with "_" are not routed.
 */

/** Loop/poster size: the game's aspect scaled so the longest edge is 640, rounded even. */
export function captureSize(aspect: string): { w: number; h: number } {
  const [aw, ah] = aspect.split('/').map((s) => parseFloat(s.trim()));
  const MAX = 640;
  let w: number;
  let h: number;
  if (aw >= ah) {
    w = MAX;
    h = Math.round((MAX * ah) / aw);
  } else {
    h = MAX;
    w = Math.round((MAX * aw) / ah);
  }
  w -= w % 2;
  h -= h % 2;
  return { w, h };
}

/** Fit an aspect inside a box, preserving ratio. */
export function fit(aspect: string, maxW: number, maxH: number): { w: number; h: number } {
  const [aw, ah] = aspect.split('/').map((s) => parseFloat(s.trim()));
  const r = aw / ah;
  let w = maxW;
  let h = w / r;
  if (h > maxH) {
    h = maxH;
    w = h * r;
  }
  return { w: Math.round(w), h: Math.round(h) };
}

export const LIST_SLUG = '__list';
