import { describe, expect, it } from 'vitest';

/**
 * Guard: UI copy must live in src/i18n/locales. Any Cyrillic in src/features
 * or src/core outside comments and regex literals is a hard-coded UI string.
 */

/** Every source file under src/features and src/core, as raw text, keyed by repo path. */
const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>(
      ['/src/features/**/*.{ts,tsx}', '/src/core/**/*.ts', '!/src/**/*.test.ts', '!/src/**/*.test.tsx'],
      { query: '?raw', import: 'default', eager: true }
    )
  ).map(([path, text]) => [path.slice(1), text])
);

/** Content logic (sentence splitting, PDF hyphenation), not UI copy. */
const ALLOWED_FILES = new Set([
  'src/core/splitter/splitter.ts',
  'src/core/splitter/sentences.ts',
  'src/core/parsers/pdfLayout.ts'
]);

const CYRILLIC = /[А-Яа-яІіЇїЄєҐґ]/;

/** Blanks out comments and regex literals, keeping line numbers. */
export function stripCommentsAndRegex(source: string): string {
  let out = '';
  let i = 0;
  let lastSignificant = '';
  const blank = (s: string) => s.replace(/[^\n]/g, ' ');

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      out += blank(source.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += blank(source.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch && !(ch !== '`' && source[j] === '\n')) {
        j += source[j] === '\\' ? 2 : 1;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
      lastSignificant = ch;
      continue;
    }
    if (ch === '/' && (lastSignificant === '' || /[(,=:[!&|?{};]/.test(lastSignificant) || /\breturn$/.test(out.trimEnd()))) {
      let j = i + 1;
      let inClass = false;
      while (j < source.length && source[j] !== '\n') {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === '[') inClass = true;
        else if (source[j] === ']') inClass = false;
        else if (source[j] === '/' && !inClass) break;
        j += 1;
      }
      out += blank(source.slice(i, j + 1));
      i = j + 1;
      lastSignificant = '/';
      continue;
    }
    out += ch;
    if (!/\s/.test(ch)) lastSignificant = ch;
    i += 1;
  }
  return out;
}

function findHits(file: string): string[] {
  const stripped = stripCommentsAndRegex(SOURCES[file] ?? '');
  return stripped
    .split('\n')
    .map((line, idx) => (CYRILLIC.test(line) ? `${file}:${idx + 1}: ${line.trim().slice(0, 80)}` : ''))
    .filter(Boolean);
}

const files = Object.keys(SOURCES).filter((f) => !ALLOWED_FILES.has(f));

describe('no hard-coded Cyrillic UI strings', () => {
  it('ignores comments and regex literals but catches strings and JSX text', () => {
    const src = [
      '// коментар',
      'const re = /[А-Я]+/g;',
      "const s = 'рядок';",
      '<p>Текст</p>',
      "const url = 'https://x.y'; // ще коментар"
    ].join('\n');
    const lines = stripCommentsAndRegex(src).split('\n');
    expect(lines.map((l) => CYRILLIC.test(l))).toEqual([false, false, true, true, false]);
  });

  it('UI files contain no Cyrillic outside comments and regex', () => {
    const hits = files.flatMap((f) => findHits(f));
    expect(hits).toEqual([]);
  });

});
