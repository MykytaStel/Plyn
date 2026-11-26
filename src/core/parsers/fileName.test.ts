import { describe, expect, it } from 'vitest';
import { titleFromFileName } from './fileName';

describe('titleFromFileName', () => {
  it('drops the extension', () => {
    expect(titleFromFileName('Notes.pdf')).toBe('Notes');
    expect(titleFromFileName('book.EPUB')).toBe('book');
  });

  it('turns underscores into spaces and collapses runs', () => {
    expect(titleFromFileName('My_long__file_name.txt')).toBe('My long file name');
  });

  it('keeps hyphens and dots inside the name', () => {
    expect(titleFromFileName('v1.2-release-notes.md')).toBe('v1.2-release-notes');
  });

  it('returns an empty string for names that are only an extension', () => {
    expect(titleFromFileName('.pdf')).toBe('');
    expect(titleFromFileName('___.txt')).toBe('');
  });
});
