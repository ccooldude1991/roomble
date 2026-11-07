/* Scoring (pure). Brick values live in bricks.ts; here are the combo and
 * stage-clear bonuses. Unit-tested. */

/** Bonus for the Nth brick broken in a combo (without the ball touching the paddle). */
export function comboBonus(comboCount: number): number {
  return comboCount > 1 ? (comboCount - 1) * 10 : 0;
}

/** Stage-clear bonus: faster clears and more lives remaining score higher. */
export function stageClearBonus(elapsedSec: number, lives: number): number {
  const timeBonus = Math.max(0, Math.round(1000 - elapsedSec * 10));
  const lifeBonus = lives * 250;
  return timeBonus + lifeBonus;
}
