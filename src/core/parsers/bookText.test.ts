import { describe, expect, it } from 'vitest';
import { normalizeText } from '../splitter/splitter';
import { cleanBlock, joinBlocks } from './bookText';

describe('joinBlocks', () => {
  const blocks = ['Part One', 'Chapter 1', 'It was quiet.', 'Chapter 2', 'Rain.'];

  it('turns block markers into offsets of the joined text', () => {
    const { text, chapters } = joinBlocks(blocks, [
      { title: 'Part One', level: 0, blockIndex: 0 },
      { title: 'Chapter 1', level: 1, blockIndex: 1 },
      { title: 'Chapter 2', level: 1, blockIndex: 3 }
    ]);
    expect(text).toBe(blocks.join('\n\n'));
    expect(normalizeText(text)).toBe(text);
    for (const c of chapters!) {
      expect(text.slice(c.offset).startsWith(c.title)).toBe(true);
    }
    expect(chapters!.map((c) => c.level)).toEqual([0, 1, 1]);
  });

  it('drops markers past the end, and a list with one entry', () => {
    const { chapters } = joinBlocks(blocks, [
      { title: 'Chapter 1', level: 0, blockIndex: 1 },
      { title: 'Ghost', level: 0, blockIndex: 99 }
    ]);
    expect(chapters).toBeUndefined();
  });

  it('keeps chapters in reading order', () => {
    const { chapters } = joinBlocks(blocks, [
      { title: 'B', level: 0, blockIndex: 3 },
      { title: 'A', level: 0, blockIndex: 1 }
    ]);
    expect(chapters!.map((c) => c.title)).toEqual(['A', 'B']);
  });

  it('cleans whitespace inside a block', () => {
    expect(cleanBlock('  a \n\t b  ')).toBe('a b');
  });
});
