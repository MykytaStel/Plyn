import { useSettingsStore } from '../store/useSettingsStore';
import { en } from './locales/en';
import { uk } from './locales/uk';
import type { Locale, Messages, PluralForms } from './types';

export type { Locale, Messages, PluralForms } from './types';

const DICTIONARIES: Record<Locale, Messages> = { uk, en };

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale];
}

/** Replaces `{name}` placeholders; unknown placeholders are left untouched. */
export function format(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

const numberFormats = new Map<Locale, Intl.NumberFormat>();
const pluralRules = new Map<Locale, Intl.PluralRules>();
const weekdayFormats = new Map<Locale, Intl.DateTimeFormat>();

function cached<T>(map: Map<Locale, T>, locale: Locale, create: () => T): T {
  let value = map.get(locale);
  if (!value) {
    value = create();
    map.set(locale, value);
  }
  return value;
}

export function formatNumber(n: number, locale: Locale): string {
  return cached(numberFormats, locale, () => new Intl.NumberFormat(locale)).format(n);
}

export function plural(forms: PluralForms, count: number, locale: Locale): string {
  const category = cached(pluralRules, locale, () => new Intl.PluralRules(locale)).select(count);
  const template = forms[category as keyof PluralForms] ?? forms.other;
  return format(template, { count: formatNumber(count, locale) });
}

/** Short weekday, capitalized ("Пн", "Mon") to match the original design. */
export function formatWeekdayShort(date: Date, locale: Locale): string {
  const label = cached(
    weekdayFormats,
    locale,
    () => new Intl.DateTimeFormat(locale, { weekday: 'short' })
  ).format(date);
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
}

export interface I18n {
  locale: Locale;
  m: Messages;
  format: typeof format;
  plural(forms: PluralForms, count: number): string;
  number(n: number): string;
}

const instances = new Map<Locale, I18n>();

export function getI18n(locale: Locale): I18n {
  return cached(instances, locale, () => ({
    locale,
    m: getMessages(locale),
    format,
    plural: (forms, count) => plural(forms, count, locale),
    number: (n) => formatNumber(n, locale)
  }));
}

/** For non-React code (stores, services). */
export function currentI18n(): I18n {
  return getI18n(useSettingsStore.getState().language);
}

/** React hook: re-renders when the UI language changes. */
export function useI18n(): I18n {
  const locale = useSettingsStore((s) => s.language);
  return getI18n(locale);
}
