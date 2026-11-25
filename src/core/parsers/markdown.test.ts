import { describe, expect, it } from 'vitest';
import { cleanMarkdown, deriveTitle } from './markdown';

describe('markdown parser', () => {
  it('strips markdown formatting while keeping readable text', () => {
    const raw = '# Заголовок\n\nЦе **жирний** текст із [посиланням](https://example.com) та `кодом`.';
    expect(cleanMarkdown(raw)).toBe(
      'Заголовок\n\nЦе жирний текст із посиланням та кодом.'
    );
  });

  it('derives concise title from first non-empty line', () => {
    expect(deriveTitle('\n\nКороткий заголовок\nТекст далі')).toBe('Короткий заголовок');
  });
});
