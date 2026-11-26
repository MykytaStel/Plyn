import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { parseFb2File } from './fb2';

const fb2 = (body: string, info = '<book-title>Назва</book-title>') =>
  `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description><title-info>${info}</title-info></description>
  <body>${body}</body>
</FictionBook>`;

const file = (text: string, name = 'book.fb2') => new File([strToU8(text)], name);

describe('parseFb2File', () => {
  it('reads a book with no sections and no table of contents', async () => {
    const parsed = await parseFb2File(file(fb2('<section><p>Один абзац.</p></section>')));
    expect(parsed).toEqual({ title: 'Назва', author: undefined, text: 'Один абзац.', chapters: undefined });
  });

  it('takes the title from the file name when the book has none', async () => {
    const parsed = await parseFb2File(file(fb2('<p>Текст.</p>', ''), 'my_book.fb2.zip'));
    expect(parsed.title).toBe('my book');
  });

  it('uses a nickname when the author has no name', async () => {
    const parsed = await parseFb2File(
      file(fb2('<p>Текст.</p>', '<author><nickname>Тиша</nickname></author><book-title>X</book-title>'))
    );
    expect(parsed.author).toBe('Тиша');
  });

  it('rejects a file that is not FictionBook', async () => {
    await expect(parseFb2File(file('<html><body>hi</body></html>'))).rejects.toMatchObject({
      code: 'fb2_invalid'
    });
  });

  it('rejects broken XML', async () => {
    await expect(parseFb2File(file('<FictionBook><body><p>oops'))).rejects.toMatchObject({
      code: 'fb2_invalid'
    });
  });

  it('rejects a zip without an .fb2 inside', async () => {
    const zip = zipSync({ 'readme.txt': strToU8('hi') });
    await expect(parseFb2File(new File([zip], 'book.fb2.zip'))).rejects.toMatchObject({
      code: 'fb2_invalid'
    });
  });

  it('rejects a book without text', async () => {
    await expect(parseFb2File(file(fb2('<section><empty-line/></section>')))).rejects.toMatchObject({
      code: 'fb2_no_text'
    });
  });
});
