import { describe, expect, it } from 'vitest';
import { format, formatWeekdayShort, getMessages, plural } from './index';
import { ACHIEVEMENTS } from '../core/achievements/achievements';
import { READING_PRESETS } from '../core/presets/readingPresets';
import { PlynError } from '../core/errors';
import { ExtractError } from '../services/extract/urlExtractor';
import { errorMessage } from './errorMessage';
import type { Locale } from './types';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      keyPaths(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [prefix];
}

function pluralEntries(value: unknown, path = ''): Array<[string, Record<string, unknown>]> {
  if (!value || typeof value !== 'object') return [];
  const obj = value as Record<string, unknown>;
  if (typeof obj.other === 'string') return [[path, obj]];
  return Object.entries(obj).flatMap(([k, v]) => pluralEntries(v, path ? `${path}.${k}` : k));
}

describe('plural', () => {
  it('picks Ukrainian plural forms', () => {
    const f = { one: '{count} картка', few: '{count} картки', many: '{count} карток', other: '{count} картки' };
    expect([1, 2, 5, 11, 14, 21, 22, 25, 111].map((n) => plural(f, n, 'uk'))).toEqual([
      '1 картка', '2 картки', '5 карток', '11 карток', '14 карток',
      '21 картка', '22 картки', '25 карток', '111 карток'
    ]);
  });

  it('picks English plural forms', () => {
    const f = { one: '{count} card', other: '{count} cards' };
    expect([plural(f, 1, 'en'), plural(f, 2, 'en')]).toEqual(['1 card', '2 cards']);
  });

  it('falls back to other when a form is missing', () => {
    expect(plural({ other: '{count} x' }, 1, 'uk')).toBe('1 x');
  });
});

describe('format', () => {
  it('interpolates and keeps unknown placeholders', () => {
    expect(format('{a} і {b}', { a: 1 })).toBe('1 і {b}');
  });
});

describe('formatWeekdayShort', () => {
  it('formats per locale', () => {
    const monday = new Date(2026, 10, 23, 12);
    expect(formatWeekdayShort(monday, 'en')).toBe('Mon');
    expect(formatWeekdayShort(monday, 'uk')).toBe('Пн');
  });
});

describe('dictionaries', () => {
  it('every uk plural entry has one/few/many/other', () => {
    for (const [path, forms] of pluralEntries(getMessages('uk'))) {
      for (const k of ['one', 'few', 'many', 'other']) {
        expect(typeof forms[k], `${path}.${k}`).toBe('string');
      }
    }
  });

  it('uk and en have identical key paths', () => {
    const uk = keyPaths(getMessages('uk')).filter((p) => !/\.(one|few|many)$/.test(p));
    const en = keyPaths(getMessages('en')).filter((p) => !/\.(one|few|many)$/.test(p));
    expect(en.sort()).toEqual(uk.sort());
  });

  it('has common.untitled in both locales', () => {
    const locales: Locale[] = ['uk', 'en'];
    for (const l of locales) expect(getMessages(l).common.untitled.length).toBeGreaterThan(0);
  });

  it('has copy for every achievement and preset in both locales', () => {
    for (const l of ['uk', 'en'] as Locale[]) {
      const m = getMessages(l);
      for (const def of ACHIEVEMENTS) {
        expect(m.achievements[def.id].title.length, `${l} ${def.id}`).toBeGreaterThan(0);
        expect(m.achievements[def.id].description.length).toBeGreaterThan(0);
      }
      for (const p of READING_PRESETS) {
        expect(m.presets[p.id].label.length, `${l} ${p.id}`).toBeGreaterThan(0);
        expect(m.presets[p.id].hint.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('errorMessage', () => {
  it('maps PlynError codes to localized copy', () => {
    const m = getMessages('en');
    expect(errorMessage(new PlynError('pdf_no_text'), m)).toBe(m.errors.pdf_no_text);
  });
  it('uses the generic message for unknown errors', () => {
    const m = getMessages('uk');
    expect(errorMessage(new Error('x'), m)).toBe(m.errors.generic);
    expect(errorMessage('boom', m)).toBe(m.errors.generic);
  });
  it('prefers an explicit fallback over the generic message', () => {
    const m = getMessages('uk');
    expect(errorMessage(new Error('x'), m, 'fallback')).toBe('fallback');
  });

  it('maps ExtractError codes, interpolating the upstream status', () => {
    const m = getMessages('en');
    expect(errorMessage(new ExtractError('no_article'), m)).toBe(m.errors.extract.no_article);
    expect(errorMessage(new ExtractError('upstream_error', { status: 503 }), m)).toContain('503');
  });
  it('never shows the untranslated server message for unknown extract codes', () => {
    const m = getMessages('en');
    expect(errorMessage(new ExtractError('unknown', { serverMessage: 'Сервер' }), m)).toBe(m.errors.generic);
    expect(
      errorMessage(new ExtractError('unknown', { serverMessage: 'Сервер' }), m, m.errors.article_read)
    ).toBe(m.errors.article_read);
  });
});
