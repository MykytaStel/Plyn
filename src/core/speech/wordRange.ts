/**
 * Turns a speech `boundary` event into the range of the word being spoken.
 * Voices also report punctuation («—») and include trailing marks («тихий,»)
 * in charLength (EXP-02), so both are cleaned up here.
 */

export interface WordRange {
  /** Inclusive start index in the card text. */
  start: number;
  /** Exclusive end index in the card text. */
  end: number;
}

const LETTER = /[\p{L}\p{N}\p{M}]/u;
const JOINER = /['’ʼ-]/u;

function isLetter(ch: string | undefined): boolean {
  return ch !== undefined && LETTER.test(ch);
}

/** A letter, or an apostrophe / hyphen between two letters. */
function isWordChar(text: string, i: number): boolean {
  const ch = text[i];
  if (isLetter(ch)) return true;
  return ch !== undefined && JOINER.test(ch) && isLetter(text[i - 1]) && isLetter(text[i + 1]);
}

export function wordRangeAt(text: string, charIndex: number, charLength = 0): WordRange | null {
  if (!Number.isInteger(charIndex) || charIndex < 0 || charIndex >= text.length) return null;
  if (!isLetter(text[charIndex])) return null;
  let wordEnd = charIndex;
  while (wordEnd < text.length && isWordChar(text, wordEnd)) wordEnd += 1;
  // charLength never stretches past the word: trailing punctuation stays out.
  const end = charLength > 0 ? Math.min(wordEnd, charIndex + charLength) : wordEnd;
  return { start: charIndex, end };
}
