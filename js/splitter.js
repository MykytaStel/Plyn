/**
 * Нарізка тексту на короткі картки без розриву слів
 * та форматування для режиму «Якір».
 */

export const CARD_LENGTH_LIMITS = {
  short: 130,
  medium: 210,
  long: 310
};

const ABBREVIATIONS = new Set([
  'т.д.', 'т.п.', 'т.ін.', 'н.е.', 'р.', 'рр.', 'м.', 'вул.', 'с.', 'ст.',
  'ім.', 'див.', 'напр.', 'тис.', 'млн.', 'млрд.', 'mr.', 'mrs.', 'ms.',
  'dr.', 'prof.', 'e.g.', 'i.e.', 'etc.', 'vs.'
]);

/**
 * Розбиває абзац на речення з урахуванням базових скорочень (без lookbehind для повної сумісності з iOS Safari).
 */
function splitIntoSentences(paragraph) {
  const matches = paragraph.match(/[^.!?…]+(?:[.!?…]+[»”)"']*|$)/g) || [paragraph];
  const sentences = [];

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

/**
 * Ділить занадто довге речення по розділових знаках або межах слів,
 * ніколи не розриваючи окреме слово.
 */
function splitLongSentence(sentence, maxChars) {
  if (sentence.length <= maxChars) return [sentence];

  const chunks = [];
  let remaining = sentence.trim();

  while (remaining.length > maxChars) {
    let sliceEnd = maxChars;
    const windowText = remaining.slice(0, maxChars + 1);

    // Спочатку пробуємо розрізати після коми, тире, крапки з комою або двокрапки
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
        // Якщо слово довше за ліміт — беремо до наступного пробілу, щоб не рвати слово
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

/**
 * Головна функція нарізки тексту на масив карток (1–2 речення / ліміт символів).
 * @param {string} rawText
 * @param {{ lengthPreset?: 'short' | 'medium' | 'long' }} options
 * @returns {string[]}
 */
export function splitTextIntoCards(rawText, options = {}) {
  const maxChars = CARD_LENGTH_LIMITS[options.lengthPreset] || CARD_LENGTH_LIMITS.medium;
  const normalized = (rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const cards = [];

  for (const paragraph of paragraphs) {
    const sentences = splitIntoSentences(paragraph);
    let buffer = '';
    let sentenceCount = 0;

    for (const sentence of sentences) {
      const parts = splitLongSentence(sentence, maxChars);

      for (const part of parts) {
        const candidate = buffer ? `${buffer} ${part}` : part;
        const canMerge =
          buffer &&
          sentenceCount < 2 &&
          candidate.length <= maxChars;

        if (canMerge) {
          buffer = candidate;
          sentenceCount += 1;
        } else {
          if (buffer) cards.push(buffer);
          buffer = part;
          sentenceCount = 1;
        }
      }
    }

    if (buffer) {
      cards.push(buffer);
    }
  }

  return cards;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Форматує текст для режиму «Якір»: виділяє початок кожного слова
 * для легшої фіксації погляду. Безпечно екранує HTML до вставки тегів.
 * @param {string} text
 * @returns {string}
 */
export function formatWithAnchors(text) {
  const wordRegex = /[A-Za-zА-Яа-яІіЇїЄєҐґ'’ʼ]+/g;
  let result = '';
  let lastIndex = 0;

  for (const match of text.matchAll(wordRegex)) {
    const word = match[0];
    const start = match.index;

    if (start > lastIndex) {
      result += escapeHtml(text.slice(lastIndex, start));
    }

    const len = word.length;
    if (len <= 1) {
      result += escapeHtml(word);
    } else {
      let leadCount = 1;
      if (len <= 3) leadCount = 1;
      else if (len <= 5) leadCount = 2;
      else if (len <= 8) leadCount = 3;
      else leadCount = Math.ceil(len * 0.4);

      const lead = escapeHtml(word.slice(0, leadCount));
      const rest = escapeHtml(word.slice(leadCount));
      result += `<span class="anchor-lead">${lead}</span>${rest}`;
    }

    lastIndex = start + len;
  }

  if (lastIndex < text.length) {
    result += escapeHtml(text.slice(lastIndex));
  }

  return result;
}
