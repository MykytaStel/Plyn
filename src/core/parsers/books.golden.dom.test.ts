import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import spec from '../../../spec/parsers/books.json';
import { normalizeText } from '../splitter/splitter';
import { parseEpubFile } from './epub';
import { parseFb2File } from './fb2';

/**
 * Golden files (TESTING.md, IMP-17): every book in spec/parsers/books/ must
 * parse to exactly the hand-written title, author, text and chapters.
 */
const BOOKS_DIR = resolve(__dirname, '../../../spec/parsers/books');

function fixtureFile(name: string): File {
  return new File([readFileSync(resolve(BOOKS_DIR, name))], name);
}

describe('spec/parsers/books.json', () => {
  it.each(spec.cases)('$file', async (expected) => {
    const file = fixtureFile(expected.file);
    const parsed = expected.file.endsWith('.epub')
      ? await parseEpubFile(file)
      : await parseFb2File(file);

    expect(parsed.title).toBe(expected.title);
    expect(parsed.author).toBe(expected.author);
    expect(parsed.text).toBe(expected.text);
    expect(parsed.chapters).toEqual(expected.chapters);

    // Offsets are valid reading positions: the text is already normalized,
    // and every chapter starts at the beginning of a paragraph.
    expect(normalizeText(parsed.text)).toBe(parsed.text);
    for (const chapter of parsed.chapters ?? []) {
      expect(chapter.offset).toBeLessThan(parsed.text.length);
      expect(chapter.offset === 0 || parsed.text.slice(chapter.offset - 2, chapter.offset) === '\n\n').toBe(true);
    }
  });
});
