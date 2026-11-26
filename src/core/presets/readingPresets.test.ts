import { describe, expect, it } from 'vitest';
import { READING_PRESETS } from './readingPresets';

describe('READING_PRESETS', () => {
  it('provides dyslexia, tired eyes, and book presets with valid settings', () => {
    expect(READING_PRESETS.map((p) => p.id)).toEqual([
      'dyslexia',
      'tired_eyes',
      'book'
    ]);

    const dyslexia = READING_PRESETS[0];
    expect(dyslexia.patch.fontFamily).toBe('dyslexic');
    expect(dyslexia.patch.sentenceFocus).toBe(true);
    expect(dyslexia.patch.theme).toBe('mint');
  });
});
