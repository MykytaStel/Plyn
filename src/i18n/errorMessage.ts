import { PlynError } from '../core/errors';
import type { Messages } from './types';

/**
 * Turns any thrown value into user-facing copy in the current language.
 * Raw `Error.message` is never shown: it may be technical or untranslated.
 */
export function errorMessage(err: unknown, m: Messages, fallback?: string): string {
  if (err instanceof PlynError) return m.errors[err.code];
  return fallback ?? m.errors.generic;
}
