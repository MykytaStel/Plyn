import { describe, expect, it } from 'vitest';
import { readerToggleFor } from './shortcuts';

describe('readerToggleFor', () => {
  it('maps physical keys to toggles', () => {
    expect(readerToggleFor({ code: 'KeyA' })).toBe('anchor');
    expect(readerToggleFor({ code: 'KeyF' })).toBe('sentenceFocus');
    expect(readerToggleFor({ code: 'KeyB' })).toBe('bookmark');
    expect(readerToggleFor({ code: 'KeyS' })).toBe('speech');
    expect(readerToggleFor({ code: 'KeyZ' })).toBe('zen');
    expect(readerToggleFor({ code: 'KeyN' })).toBe('thoughts');
  });

  it('works regardless of layout (Ukrainian layout sends the same code)', () => {
    // Ukrainian layout: physical A types "ф" but e.code is still "KeyA".
    expect(readerToggleFor({ code: 'KeyA' })).toBe('anchor');
  });

  it('ignores other keys', () => {
    expect(readerToggleFor({ code: 'KeyQ' })).toBeNull();
    expect(readerToggleFor({ code: 'Space' })).toBeNull();
  });
});
