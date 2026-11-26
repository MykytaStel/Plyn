import type { Locale } from './types';

export const LOCALES: readonly Locale[] = ['uk', 'en'];

/** Endonyms: each language is always shown in its own name. */
export const LOCALE_NAMES: Record<Locale, string> = {
  uk: 'Українська',
  en: 'English'
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
