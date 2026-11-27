import { describe, expect, it } from 'vitest';
import pdfSpec from '../../../spec/parsers/pdf-cases.json';
import {
  joinParagraphLines,
  reconstructPdfText,
  type PdfPageItems
} from './pdfLayout';

describe('pdfLayout (EXP-01 golden cases)', () => {
  for (const testCase of pdfSpec.cases) {
    it(testCase.name, () => {
      const actual = reconstructPdfText(testCase.pages as PdfPageItems[]);
      expect(actual).toBe(testCase.expected);
    });
  }

  it('handles soft hyphens and English compounds safely', () => {
    expect(joinParagraphLines('read\u00AD', 'ability')).toBe('readability');
    expect(joinParagraphLines('well-', 'known')).toBe('well-known');
    expect(joinParagraphLines('wonder-', 'ful')).toBe('wonderful');
  });

  it('processes a synthetic 300-page book well within the EXP-01 time budget', () => {
    const pages: PdfPageItems[] = Array.from({ length: 300 }, (_, idx) => ({
      pageNumber: idx + 1,
      items: [
        { str: 'Book Running Header', x: 72, y: 760, width: 160, height: 10 },
        ...Array.from({ length: 28 }, (__, lineIdx) => ({
          str: `Line ${lineIdx + 1} of page ${idx + 1} with calm reading text.`,
          x: 72,
          y: 720 - lineIdx * 16,
          width: 340,
          height: 12
        })),
        { str: String(idx + 1), x: 280, y: 40, width: 15, height: 10 }
      ]
    }));

    const start = performance.now();
    const text = reconstructPdfText(pages);
    const elapsedMs = performance.now() - start;

    expect(text).not.toContain('Book Running Header');
    expect(text.length).toBeGreaterThan(50000);
    expect(elapsedMs).toBeLessThan(1500);
  });
});

describe('joinParagraphLines: ordinary words that start like a prefix', () => {
  it.each([
    ['по-', 'чаток', 'початок'],
    ['пів-', 'денний', 'південний'],
    ['мікро-', 'скоп', 'мікроскоп'],
    ['екс-', 'перт', 'експерт'],
    ['веб-', 'сайт', 'вебсайт'],
    ['re-', 'port', 'report'],
    ['pre-', 'vious', 'previous']
  ])('%s + %s → %s', (left, right, expected) => {
    expect(joinParagraphLines(left, right)).toBe(expected);
  });

  it.each([
    ['по-', 'українськи', 'по-українськи'],
    ['по-', 'моєму', 'по-моєму'],
    ['по-', 'перше', 'по-перше'],
    ['віце-', 'прем’єр', 'віце-прем’єр'],
    ['будь-', 'який', 'будь-який'],
    ['e-', 'mail', 'e-mail']
  ])('keeps the compound %s + %s → %s', (left, right, expected) => {
    expect(joinParagraphLines(left, right)).toBe(expected);
  });
});
