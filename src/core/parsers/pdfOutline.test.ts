import { describe, expect, it } from 'vitest';
import { pdfOutlineToChapters } from './pdfOutline';
import type { ReconstructedPdf } from './pdfLayout';

// Page 1: imprint, page 2: contents, page 3: chapter 1, page 5: chapter 2.
const paragraphs = [
  { page: 1, text: 'ISBN 978-601-12-4595-1. Астана: Спринт Бук, 2025.' },
  { page: 2, text: 'Зміст' },
  { page: 2, text: 'Глава 1. Початок ... 3' },
  { page: 3, text: 'Вступне слово перед главою.' },
  { page: 3, text: 'Глава 1. Початок' },
  { page: 3, text: 'Перший абзац першої глави.' },
  { page: 5, text: 'ГЛАВА 2.  Далі' },
  { page: 5, text: 'Текст другої глави.' }
];

function pdf(): ReconstructedPdf {
  const pageStarts: ReconstructedPdf['pageStarts'] = [];
  let offset = 0;
  for (const p of paragraphs) {
    if (!pageStarts.length || pageStarts[pageStarts.length - 1].pageNumber < p.page) {
      pageStarts.push({ pageNumber: p.page, offset });
    }
    offset += p.text.length + 2;
  }
  return { text: paragraphs.map((p) => p.text).join('\n\n'), pageStarts };
}

describe('pdfOutlineToChapters', () => {
  const doc = pdf();

  it('points each entry at its heading on that page', () => {
    const chapters = pdfOutlineToChapters(
      [
        { title: 'Глава 1. Початок', pageNumber: 3, level: 0 },
        { title: 'Глава 2. Далі', pageNumber: 5, level: 0 }
      ],
      doc
    );
    expect(chapters.map((c) => doc.text.slice(c.offset, c.offset + 16))).toEqual([
      'Глава 1. Початок',
      'ГЛАВА 2.  Далі\n\n'
    ]);
    expect(chapters.map((c) => c.title)).toEqual(['Глава 1. Початок', 'Глава 2. Далі']);
  });

  it('does not match the same title in the contents page before it', () => {
    const [first] = pdfOutlineToChapters([{ title: 'Глава 1. Початок', pageNumber: 3, level: 0 }], doc);
    expect(first.offset).toBe(doc.text.indexOf('Глава 1. Початок\n'));
  });

  it('falls back to the page start when the title is not on the page', () => {
    const [entry] = pdfOutlineToChapters([{ title: 'Передмова', pageNumber: 3, level: 1 }], doc);
    expect(entry.offset).toBe(doc.text.indexOf('Вступне слово'));
    expect(entry.level).toBe(1);
  });

  it('uses the next page that has text for a page with none', () => {
    const [entry] = pdfOutlineToChapters([{ title: 'Ілюстрація', pageNumber: 4, level: 0 }], doc);
    expect(entry.offset).toBe(doc.text.indexOf('ГЛАВА 2'));
  });

  it('drops entries past the text, without a title, or with a bad page', () => {
    expect(
      pdfOutlineToChapters(
        [
          { title: 'Кінець', pageNumber: 99, level: 0 },
          { title: '  ', pageNumber: 3, level: 0 },
          { title: 'Нуль', pageNumber: 0, level: 0 }
        ],
        doc
      )
    ).toEqual([]);
  });

  it('keeps reading order and one entry per offset', () => {
    const chapters = pdfOutlineToChapters(
      [
        { title: 'Глава 2. Далі', pageNumber: 5, level: 0 },
        { title: 'Частина I', pageNumber: 3, level: 0 },
        { title: 'Глава 1. Початок', pageNumber: 3, level: 1 },
        { title: 'Глава 1. Початок', pageNumber: 3, level: 1 }
      ],
      doc
    );
    const offsets = chapters.map((c) => c.offset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    expect(new Set(offsets).size).toBe(offsets.length);
  });
});
