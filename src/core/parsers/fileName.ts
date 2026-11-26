/**
 * Turns a file name into a readable title: drops the extension and treats
 * underscores as spaces (`My_notes.pdf` → `My notes`).
 */
export function titleFromFileName(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
