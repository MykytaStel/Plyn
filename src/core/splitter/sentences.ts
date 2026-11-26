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

  const matches =
    cleanText.match(/[^.!?…]+(?:[.!?…]+[»”)"']*|$)/g) || [cleanText];
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
