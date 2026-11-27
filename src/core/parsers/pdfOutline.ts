import type { DocumentChapter } from '../models/types';
import type { ReconstructedPdf } from './pdfLayout';

/** One entry of a PDF's own table of contents (its outline / bookmarks). */
export interface PdfOutlineEntry {
  title: string;
  /** 1-based page the entry points to. */
  pageNumber: number;
  /** Nesting depth, 0 for top level. */
  level: number;
}

/** How far into a page the heading is looked for, in characters. */
const HEADING_SEARCH_WINDOW = 3000;

/** Lower case with whitespace collapsed, for a forgiving title match. */
function fold(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

/** Folded text plus, for each folded character, its index in the original. */
function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  let inSpace = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (inSpace) continue;
      inSpace = true;
      folded += ' ';
    } else {
      inSpace = false;
      folded += ch.toLowerCase();
    }
    map.push(i);
  }
  return { folded, map };
}

/**
 * Turns a PDF outline (title + page) into chapters with offsets in the
 * reconstructed text (0.25). Each entry starts at its own page; when the
 * title is printed on that page, the chapter starts at that heading's
 * paragraph instead. Nothing is guessed beyond that: no outline, no chapters.
 */
export function pdfOutlineToChapters(
  outline: PdfOutlineEntry[],
  pdf: ReconstructedPdf
): DocumentChapter[] {
  const { text, pageStarts } = pdf;
  const chapters: DocumentChapter[] = [];

  for (const entry of outline) {
    const title = entry.title.replace(/\s+/g, ' ').trim();
    if (!title || !Number.isInteger(entry.pageNumber) || entry.pageNumber < 1) continue;

    // The first page at or after the target that has text of its own.
    const start = pageStarts.find((p) => p.pageNumber >= entry.pageNumber);
    if (!start) continue;

    let offset = start.offset;
    const windowText = text.slice(start.offset, start.offset + HEADING_SEARCH_WINDOW);
    const { folded, map } = foldWithMap(windowText);
    const found = folded.indexOf(fold(title));
    if (found >= 0) {
      const at = start.offset + map[found];
      // Start at the beginning of the paragraph that holds the heading.
      offset = text.lastIndexOf('\n', at - 1) + 1;
    }

    chapters.push({ title, offset, level: Math.max(0, Math.min(6, entry.level)) });
  }

  chapters.sort((a, b) => a.offset - b.offset);
  return chapters.filter((c, i) => i === 0 || c.offset !== chapters[i - 1].offset);
}
