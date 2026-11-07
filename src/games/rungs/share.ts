/*
 * Spoiler-free share text. Emoji are fine here: this is content the player chooses
 * to share, not site UI. One square per rung the player climbed — green for a word
 * they found, yellow for one a hint revealed — so it shows effort without giving
 * the words away. Title and url come from config; nothing is hardcoded.
 */

export interface ShareInput {
  /** Game title, e.g. "Rungs". */
  title: string;
  /** 1-based puzzle number. */
  number: number;
  /** Steps the player took (rungs from start to end). */
  steps: number;
  /** Par (shortest possible). */
  par: number;
  /** One flag per step: true if that rung came from a hint. */
  hints: boolean[];
  /** Full URL to the game. */
  url: string;
}

const FOUND = '\u{1F7E9}'; // 🟩
const HINTED = '\u{1F7E8}'; // 🟨

export function shareText(input: ShareInput): string {
  const { title, number, steps, par, hints, url } = input;
  const squares = Array.from({ length: steps }, (_, i) => (hints[i] ? HINTED : FOUND)).join('');
  return `${title} #${number}  ${steps}/${par} par\n${squares}\n${url}`;
}
