import type { AnchorToken } from '../models/types';

const WORD_REGEX = /[A-Za-zА-Яа-яІіЇїЄєҐґ'’ʼ]+/g;

export function getAnchorLeadLength(wordLength: number): number {
  if (wordLength <= 1) return 0;
  if (wordLength <= 3) return 1;
  if (wordLength <= 5) return 2;
  if (wordLength <= 8) return 3;
  return Math.ceil(wordLength * 0.4);
}

/**
 * Розбиває текст на чисті токени для режиму «Якір» без генерації сирого HTML.
 * Безпечно для React і легко переноситься у SwiftUI AttributedString / Compose AnnotatedString.
 */
export function tokenizeWithAnchors(text: string): AnchorToken[] {
  const tokens: AnchorToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(WORD_REGEX)) {
    const word = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, start) });
    }

    const leadCount = getAnchorLeadLength(word.length);
    if (leadCount === 0) {
      tokens.push({ type: 'text', value: word });
    } else {
      tokens.push({
        type: 'word',
        lead: word.slice(0, leadCount),
        rest: word.slice(leadCount)
      });
    }

    lastIndex = start + word.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
}
