import { PlynError } from '../core/errors';
import { ExtractError } from '../services/extract/urlExtractor';
import { format } from './index';
import type { Messages } from './types';

/**
 * Turns any thrown value into user-facing copy in the current language.
 * Raw `Error.message` is never shown: it may be technical or untranslated.
 */
export function errorMessage(err: unknown, m: Messages, fallback?: string): string {
  if (err instanceof PlynError) return m.errors[err.code];
  if (err instanceof ExtractError) {
    if (err.code === 'unknown') return fallback ?? m.errors.generic;
    return format(m.errors.extract[err.code], { status: err.status ?? '' });
  }
  return fallback ?? m.errors.generic;
}
