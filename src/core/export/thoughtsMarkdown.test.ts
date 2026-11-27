import { describe, expect, it } from 'vitest';
import type { ThoughtNote } from '../models/types';
import { formatThoughtsAsMarkdown, thoughtsFileName } from './thoughtsMarkdown';

const labels = { title: 'Thoughts', untitled: 'No text' };
const formatDate = (ms: number) => `d${ms}`;
const note = (id: string, text: string, createdAt: number, docTitle?: string): ThoughtNote => ({
  id,
  text,
  createdAt,
  docTitle
});
const run = (thoughts: ThoughtNote[]) =>
  formatThoughtsAsMarkdown({ thoughts, labels, formatDate });

describe('formatThoughtsAsMarkdown', () => {
  it('returns only the title for an empty list', () => {
    expect(run([])).toBe('# Thoughts\n');
  });

  it('groups by document, the one with the newest thought first, newest first inside', () => {
    const md = run([
      note('1', 'a1', 10, 'DocA'),
      note('2', 'b1', 5, 'DocB'),
      note('3', 'a2', 20, 'DocA'),
      note('4', 'b2', 30, 'DocB')
    ]);
    expect(md.indexOf('## DocB')).toBeLessThan(md.indexOf('## DocA'));
    expect(md.indexOf('b2')).toBeLessThan(md.indexOf('b1'));
    expect(md.indexOf('a2')).toBeLessThan(md.indexOf('a1'));
  });

  it('puts DocA first when it has the newest thought', () => {
    const md = run([note('1', 'x', 50, 'DocA'), note('2', 'y', 5, 'DocB')]);
    expect(md.indexOf('## DocA')).toBeLessThan(md.indexOf('## DocB'));
  });

  it('files thoughts without a title under the untitled heading', () => {
    expect(run([note('1', 'hi', 1)])).toContain('## No text\n');
  });

  it('formats each thought as a list item with its date', () => {
    expect(run([note('1', 'buy coffee', 7, 'D')])).toBe(
      '# Thoughts\n\n## D\n\n- buy coffee (d7)\n'
    );
  });

  it('keeps newlines inside the list item and escapes a leading #', () => {
    const md = run([note('1', '# idea\nsecond\nthird', 7, 'D')]);
    expect(md).toContain('- \\# idea\n  second\n  third (d7)');
  });
});

describe('thoughtsFileName', () => {
  it('uses the local date with padded month and day', () => {
    expect(thoughtsFileName(new Date(2026, 0, 5, 23, 59))).toBe('plyn-thoughts-2026-01-05.md');
  });
});
