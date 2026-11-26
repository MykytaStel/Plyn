export type ContentLanguage = 'uk' | 'en';

/**
 * Detects the language of the text being read (not the UI language).
 * Drives the reader card `lang` (hyphenation) and the TTS voice.
 */
export function detectContentLanguage(text: string): ContentLanguage {
  const cyrillic = (text.match(/[А-Яа-яІіЇїЄєҐґ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return cyrillic >= latin ? 'uk' : 'en';
}

export function contentLanguageToSpeechTag(
  lang: ContentLanguage
): 'uk-UA' | 'en-US' {
  return lang === 'uk' ? 'uk-UA' : 'en-US';
}
