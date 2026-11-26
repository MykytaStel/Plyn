import type { DocumentChapter } from '../models/types';

/**
 * Shared output of the book parsers (EPUB, FB2): text and table of contents.
 */
export interface ParsedBook {
  title: string;
  author?: string;
  text: string;
  /** Present only when the book has at least two entries. */
  chapters?: DocumentChapter[];
}

/** A table-of-contents entry that starts at block `blockIndex`. */
export interface ChapterMarker {
  title: string;
  level: number;
  blockIndex: number;
}

const BLOCK_SEPARATOR = '\n\n';

/** Collapses whitespace inside one paragraph, like the reader's normalization does. */
export function cleanBlock(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * Joins paragraphs with blank lines and turns markers into character offsets
 * of the joined text. Blocks must already be clean and non-empty, so the
 * result is its own normalized form (normalizeText changes nothing) and the
 * offsets are valid reading positions.
 *
 * Markers past the last block are dropped; a list with fewer than two
 * entries is not worth showing, so it is dropped too.
 */
export function joinBlocks(
  blocks: string[],
  markers: ChapterMarker[] = []
): { text: string; chapters?: DocumentChapter[] } {
  const starts: number[] = [];
  let offset = 0;
  for (const block of blocks) {
    starts.push(offset);
    offset += block.length + BLOCK_SEPARATOR.length;
  }

  const chapters: DocumentChapter[] = markers
    .filter((m) => m.blockIndex >= 0 && m.blockIndex < blocks.length)
    .map((m) => ({
      title: cleanBlock(m.title),
      offset: starts[m.blockIndex],
      level: Math.max(0, m.level)
    }))
    .filter((c) => c.title.length > 0)
    .sort((a, b) => a.offset - b.offset);

  return {
    text: blocks.join(BLOCK_SEPARATOR),
    chapters: chapters.length >= 2 ? chapters : undefined
  };
}

/** Gives the browser a moment to paint between chunks of a long parse. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
