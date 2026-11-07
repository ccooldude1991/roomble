/* Scoring (pure). Each fusion scores 2^newTier; chaining several in one move
 * adds a small bonus. Unit-tested. */

export function pointsForTier(tier: number): number {
  return 2 ** tier;
}

/** Score for a move's fusions (`merges` holds each new tier) plus a chain bonus. */
export function scoreForMove(merges: number[]): number {
  let total = 0;
  for (const tier of merges) total += pointsForTier(tier);
  if (merges.length > 1) total += (merges.length - 1) * 25; // chain bonus
  return total;
}
