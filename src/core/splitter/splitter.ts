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

/** A half-open range `[start, end)` in the normalized text. */
interface Span {
  start: number;
  end: number;
}

const SENTENCE_REGEX = /[^.!?…]+(?:[.!?…]+[»”)"']*|$)/g;

/** Shrinks a span so it starts and ends on a non-space character. */
function trimSpan(text: string, span: Span): Span {
  let { start, end } = span;
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;
  return { start, end };
}

/**
 * Sentences of one paragraph as spans of the normalized text. Characters the
 * sentence pattern skips (leading "?", "…") join the next sentence, so no
 * text is ever lost.
 */
function splitIntoSentences(text: string, paragraph: Span): Span[] {
  const source = text.slice(paragraph.start, paragraph.end);
  const boundaries: number[] = [];
  for (const match of source.matchAll(SENTENCE_REGEX)) {
    boundaries.push((match.index ?? 0) + match[0].length);
  }
  if (boundaries.length === 0 || boundaries[boundaries.length - 1] < source.length) {
    boundaries.push(source.length);
  }

  const sentences: Span[] = [];
  let from = 0;
  for (const to of boundaries) {
    const span = trimSpan(text, { start: paragraph.start + from, end: paragraph.start + to });
    from = to;
    if (span.end <= span.start) continue;

    if (sentences.length > 0) {
      const prev = sentences[sentences.length - 1];
      const lastWord = text.slice(prev.start, prev.end).split(/\s+/).pop()?.toLowerCase() || '';
      if (ABBREVIATIONS.has(lastWord)) {
        prev.end = span.end;
        continue;
      }
    }
    sentences.push(span);
  }

  return sentences;
}

function splitLongSentence(text: string, sentence: Span, maxChars: number): Span[] {
  if (sentence.end - sentence.start <= maxChars) return [sentence];

  const chunks: Span[] = [];
  let pos = sentence.start;

  while (sentence.end - pos > maxChars) {
    const remaining = text.slice(pos, sentence.end);
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

    chunks.push(trimSpan(text, { start: pos, end: pos + sliceEnd }));
    pos += sliceEnd;
    while (pos < sentence.end && /\s/.test(text[pos])) pos += 1;
  }

  if (pos < sentence.end) {
    chunks.push({ start: pos, end: sentence.end });
  }

  return chunks;
}

export interface SplitOptions {
  lengthPreset?: CardLengthPreset;
}

/**
 * Розбиває текст на короткі картки (1–2 речення / ліміт символів без розриву слів)
 * і обчислює точний charOffset кожної картки для кросплатформової синхронізації.
 *
 * Every card is the exact slice `normalized.slice(startOffset, endOffset)`,
 * so offsets never drift, whatever the spacing in the source.
 */
export function splitTextIntoCards(
  rawText: string,
  options: SplitOptions = {}
): ReadingCard[] {
  const maxChars = CARD_LENGTH_LIMITS[options.lengthPreset ?? 'medium'];
  const normalized = normalizeText(rawText);
  if (!normalized) return [];

  const spans: Span[] = [];

  for (const line of normalized.matchAll(/[^\n]+/g)) {
    const start = line.index ?? 0;
    const paragraph = trimSpan(normalized, { start, end: start + line[0].length });
    if (paragraph.end <= paragraph.start) continue;

    let buffer: Span | null = null;
    let sentenceCount = 0;

    for (const sentence of splitIntoSentences(normalized, paragraph)) {
      for (const part of splitLongSentence(normalized, sentence, maxChars)) {
        const canMerge =
          buffer !== null &&
          sentenceCount < 2 &&
          part.end - buffer.start <= maxChars;

        if (canMerge && buffer) {
          buffer = { start: buffer.start, end: part.end };
          sentenceCount += 1;
        } else {
          if (buffer) spans.push(buffer);
          buffer = part;
          sentenceCount = 1;
        }
      }
    }

    if (buffer) spans.push(buffer);
  }

  return spans.map((span, index) => ({
    index,
    text: normalized.slice(span.start, span.end),
    startOffset: span.start,
    endOffset: span.end
  }));
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
