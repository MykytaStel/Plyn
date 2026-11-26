const ABBREVIATIONS = new Set([
  'т.д.', 'т.п.', 'т.ін.', 'н.е.', 'р.', 'рр.', 'м.', 'вул.', 'с.', 'ст.',
  'ім.', 'див.', 'напр.', 'тис.', 'млн.', 'млрд.', 'ін.',
  'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'e.g.', 'i.e.', 'etc.', 'vs.'
]);

/**
 * Розбиває текст однієї картки на окремі речення для режиму «Фокус-речення»
 * (підсвічування одного речення за раз, щоб погляд не перестрибував).
 */
export function splitCardIntoSentences(text: string): string[] {
  const cleanText = (text || '').trim();
  if (!cleanText) return [];

  // Split at the end of each sentence match; characters the pattern skips
  // (a leading "?" or "…") stay with the next sentence instead of vanishing.
  const boundaries: number[] = [];
  for (const match of cleanText.matchAll(/[^.!?…]+(?:[.!?…]+[»”)"']*|$)/g)) {
    boundaries.push((match.index ?? 0) + match[0].length);
  }
  if (boundaries.length === 0 || boundaries[boundaries.length - 1] < cleanText.length) {
    boundaries.push(cleanText.length);
  }

  const sentences: string[] = [];
  let from = 0;

  for (const to of boundaries) {
    const clean = cleanText.slice(from, to).trim();
    from = to;
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
