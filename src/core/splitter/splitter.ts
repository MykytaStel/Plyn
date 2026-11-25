import type { CardLengthPreset, ReadingCard } from '../models/types';

export const CARD_LENGTH_LIMITS: Record<CardLengthPreset, number> = {
  short: 130,
  medium: 210,
  long: 310
};

const ABBREVIATIONS = new Set([
  'т.д.', 'т.п.', 'т.ін.', 'н.е.', 'р.', 'рр.', 'м.', 'вул.', 'с.', 'ст.',
  'ім.', 'див.', 'напр.', 'тис.', 'млн.', 'млрд.', 'ін.',
  'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'e.g.', 'i.e.', 'etc.', 'vs.'
]);

export function normalizeText(rawText: string): string {
  return (rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function splitIntoSentences(paragraph: string): string[] {
  const matches = paragraph.match(/[^.!?…]+(?:[.!?…]+[»”)"']*|$)/g) || [paragraph];
  const sentences: string[] = [];

  for (const token of matches) {
    const clean = token.trim();
    if (!clean) continue;

    if (sentences.length > 0) {
      const prev = sentences[sentences.length - 1];
      const lastWord = prev.split(/\s+/).pop()?.toLowerCase() || '';
      if (ABBREVIATIONS.has(lastWord)) {
        sentences[sentences.length - 1] = `${prev} ${clean}`;
        continue;
      }
    }
    sentences.push(clean);
  }

  return sentences;
}

function splitLongSentence(sentence: string, maxChars: number): string[] {
  if (sentence.length <= maxChars) return [sentence];

  const chunks: string[] = [];
  let remaining = sentence.trim();

  while (remaining.length > maxChars) {
    let sliceEnd = maxChars;
    const windowText = remaining.slice(0, maxChars + 1);

    const softBreak = Math.max(
      windowText.lastIndexOf(', '),
      windowText.lastIndexOf('; '),
      windowText.lastIndexOf(': '),
      windowText.lastIndexOf(' — '),
      windowText.lastIndexOf(' – ')
    );

    if (softBreak >= Math.floor(maxChars * 0.45)) {
      const delimiterLen =
        windowText.slice(softBreak).startsWith(' — ') ||
        windowText.slice(softBreak).startsWith(' – ')
          ? 3
          : 2;
      sliceEnd = softBreak + delimiterLen;
    } else {
      const lastSpace = windowText.lastIndexOf(' ');
      if (lastSpace > 0) {
        sliceEnd = lastSpace;
      } else {
        const nextSpace = remaining.indexOf(' ', maxChars);
        sliceEnd = nextSpace === -1 ? remaining.length : nextSpace;
      }
    }

    chunks.push(remaining.slice(0, sliceEnd).trim());
    remaining = remaining.slice(sliceEnd).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

export interface SplitOptions {
  lengthPreset?: CardLengthPreset;
}

/**
 * Розбиває текст на короткі картки (1–2 речення / ліміт символів без розриву слів)
 * і обчислює точний charOffset кожної картки для кросплатформової синхронізації.
 */
export function splitTextIntoCards(
  rawText: string,
  options: SplitOptions = {}
): ReadingCard[] {
  const maxChars = CARD_LENGTH_LIMITS[options.lengthPreset ?? 'medium'];
  const normalized = normalizeText(rawText);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const rawCards: string[] = [];

  for (const paragraph of paragraphs) {
    const sentences = splitIntoSentences(paragraph);
    let buffer = '';
    let sentenceCount = 0;

    for (const sentence of sentences) {
      const parts = splitLongSentence(sentence, maxChars);

      for (const part of parts) {
        const candidate = buffer ? `${buffer} ${part}` : part;
        const canMerge =
          Boolean(buffer) &&
          sentenceCount < 2 &&
          candidate.length <= maxChars;

        if (canMerge) {
          buffer = candidate;
          sentenceCount += 1;
        } else {
          if (buffer) rawCards.push(buffer);
          buffer = part;
          sentenceCount = 1;
        }
      }
    }

    if (buffer) {
      rawCards.push(buffer);
    }
  }

  // Прив'язуємо кожну картку до її startOffset / endOffset у нормалізованому тексті
  let cursor = 0;
  return rawCards.map((text, index) => {
    const found = normalized.indexOf(text, cursor);
    const startOffset = found >= 0 ? found : cursor;
    const endOffset = startOffset + text.length;
    cursor = endOffset;

    return {
      index,
      text,
      startOffset,
      endOffset
    };
  });
}

/**
 * Знаходить індекс картки, якій відповідає збережений charOffset.
 */
export function findCardIndexByOffset(
  cards: ReadingCard[],
  charOffset: number
): number {
  if (cards.length === 0) return 0;
  if (charOffset <= 0) return 0;

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    if (charOffset >= card.startOffset && charOffset < card.endOffset) {
      return i;
    }
    if (charOffset < card.startOffset) {
      return i;
    }
  }

  return cards.length - 1;
}
