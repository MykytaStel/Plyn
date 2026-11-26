/**
 * М'яко прибирає базову Markdown-розмітку для комфортного читання картками.
 */
export function cleanMarkdown(md: string): string {
  return (md || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .trim();
}

/**
 * Генерує короткий заголовок із першого непорожнього рядка тексту.
 */
export function deriveTitle(text: string, fallback: string): string {
  const firstLine =
    (text || '')
      .split(/\n+/)
      .map((line) => line.trim())
      .find(Boolean) || fallback;

  if (firstLine.length <= 54) return firstLine;
  return `${firstLine.slice(0, 51).trimEnd()}…`;
}
