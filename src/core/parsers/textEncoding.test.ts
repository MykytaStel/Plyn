import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import spec from '../../../spec/parsers/txt-encodings.json';
import { decodeTextBytes, detectTextEncoding } from './textEncoding';

const TXT_DIR = resolve(__dirname, '../../../spec/parsers/txt');

/** Encodes text into an 8-bit code page by inverting TextDecoder. */
function encode8bit(text: string, label: 'windows-1251' | 'koi8-u'): Uint8Array {
  const decoder = new TextDecoder(label);
  const table = new Map<string, number>();
  for (let b = 0; b < 256; b += 1) {
    const ch = decoder.decode(new Uint8Array([b]));
    if (!table.has(ch)) table.set(ch, b);
  }
  return Uint8Array.from([...text].map((ch) => table.get(ch) ?? 0x3f));
}

describe('spec/parsers/txt-encodings.json (golden files)', () => {
  it.each(spec.cases)('$file → $encoding', ({ file, encoding, text }) => {
    const bytes = new Uint8Array(readFileSync(resolve(TXT_DIR, file)));
    const decoded = decodeTextBytes(bytes);
    expect(decoded.encoding).toBe(encoding);
    expect(decoded.confident).toBe(true);
    expect(decoded.text).toBe(text);
  });
});

describe('detectTextEncoding', () => {
  it('treats an empty file as UTF-8', () => {
    expect(detectTextEncoding(new Uint8Array())).toEqual({ encoding: 'utf-8', confident: true });
  });

  it('falls back to UTF-8 and says so when the bytes are not Cyrillic text', () => {
    // Latin-1 accented letters: invalid UTF-8, and no Cyrillic in either code page reads well.
    const bytes = Uint8Array.from([0x63, 0x61, 0x66, 0xe9, 0x20, 0x6e, 0x61, 0xef, 0x76, 0x65]);
    const result = decodeTextBytes(bytes);
    expect(result.confident).toBe(false);
    expect(result.encoding).toBe('utf-8');
  });

  it('decides on a sample of a big file', () => {
    const line = 'Тиха вода береги рве. ';
    const bytes = encode8bit(line.repeat(10_000), 'windows-1251');
    expect(bytes.length).toBeGreaterThan(64 * 1024);
    expect(detectTextEncoding(bytes).encoding).toBe('windows-1251');
  });

  // Re-encoded set (EXP-04: ≥ 95 %). Ukrainian sentences built from real words,
  // 8-bit encodings only, because UTF-8/16 are exact by construction.
  const WORDS = [
    'книга', 'читати', 'ранок', 'тиша', 'дім', 'їжак', 'єдність', 'ґанок', 'світло', 'вода',
    'сонце', 'дорога', 'пісня', 'слово', 'місто', 'день', 'ніч', 'серце', 'думка', 'час'
  ];
  const sentence = fc
    .array(fc.constantFrom(...WORDS), { minLength: 4, maxLength: 14 })
    .map((ws) => {
      const s = ws.join(' ');
      return `${s[0].toUpperCase()}${s.slice(1)}.`;
    });

  it.each(['windows-1251', 'koi8-u'] as const)('recognises %s in generated Ukrainian text', (label) => {
    fc.assert(
      fc.property(fc.array(sentence, { minLength: 1, maxLength: 6 }), (sentences) => {
        const text = sentences.join(' ');
        const decoded = decodeTextBytes(encode8bit(text, label));
        expect(decoded.encoding).toBe(label);
        expect(decoded.text).toBe(text);
      }),
      { seed: 2311, numRuns: 200 }
    );
  });
});
