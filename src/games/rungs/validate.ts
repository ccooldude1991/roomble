/*
 * Validating a word the player submits against the previous rung.
 * Invalid words never count against the player — they just explain themselves.
 */
import { diffCount } from './graph';

export type StepError = 'length' | 'change-one' | 'not-word';

export const STEP_MESSAGES: Record<StepError, string> = {
  length: 'Finish the word first',
  'change-one': 'Change exactly one letter',
  'not-word': 'Not in the word list',
};

/**
 * Check a candidate rung played on top of `prev`.
 * Returns null when the word is accepted, or an error code otherwise.
 */
export function checkStep(prev: string, candidate: string, dict: Set<string>): StepError | null {
  const next = candidate.toLowerCase();
  if (next.length !== prev.length) return 'length';
  if (diffCount(prev, next) !== 1) return 'change-one';
  if (!dict.has(next)) return 'not-word';
  return null;
}
