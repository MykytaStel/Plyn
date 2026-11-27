import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PlynError } from '../errors';
import { titleFromFileName } from './fileName';
import type { DocumentChapter } from '../models/types';
import {
  reconstructPdfDocument,
  type PdfPageItems,
  type PdfTextItem
} from './pdfLayout';
import { pdfOutlineToChapters, type PdfOutlineEntry } from './pdfOutline';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedPdf {
  title: string;
  text: string;
  /** From the PDF's own outline; present only with at least two entries (0.25). */
  chapters?: DocumentChapter[];
}

/** Outline entries read at most, so a broken file cannot stall the import. */
const MAX_OUTLINE_ENTRIES = 1000;

type PdfDoc = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
type OutlineNode = Awaited<ReturnType<PdfDoc['getOutline']>>[number];

/** The PDF's outline as (title, page, level); empty when it has none. */
async function readOutline(pdf: PdfDoc): Promise<PdfOutlineEntry[]> {
  const entries: PdfOutlineEntry[] = [];
  const visit = async (nodes: OutlineNode[] | undefined, level: number) => {
    for (const node of nodes ?? []) {
      if (entries.length >= MAX_OUTLINE_ENTRIES) return;
      try {
        const dest =
          typeof node.dest === 'string' ? await pdf.getDestination(node.dest) : node.dest;
        const ref = Array.isArray(dest) ? dest[0] : null;
        const pageIndex =
          typeof ref === 'number'
            ? ref
            : ref && typeof ref === 'object'
              ? await pdf.getPageIndex(ref as Parameters<PdfDoc['getPageIndex']>[0])
              : -1;
        if (pageIndex >= 0 && typeof node.title === 'string') {
          entries.push({ title: node.title, pageNumber: pageIndex + 1, level });
        }
      } catch {
        // One broken entry does not spoil the rest.
      }
      await visit(node.items, level + 1);
    }
  };
  try {
    await visit(await pdf.getOutline(), 0);
  } catch {
    return [];
  }
  return entries;
}

const YIELD_EVERY_PAGES = 10;

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });
}

/**
 * Локально витягує текст із PDF-документа з відбудовою абзаців,
 * склеюванням переносів і видаленням колонтитулів (підвантажується ліниво).
 */
export async function parsePdfFile(file: File): Promise<ParsedPdf> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let metaTitle = '';
  try {
    const metadata = await pdf.getMetadata();
    const info = metadata?.info as { Title?: unknown } | undefined;
    if (typeof info?.Title === 'string' && info.Title.trim().length > 1) {
      metaTitle = info.Title.trim();
    }
  } catch {
    // Metadata is optional
  }

  const pages: PdfPageItems[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = [];

    for (const rawItem of content.items) {
      if (!('str' in rawItem)) continue;
      const transform = rawItem.transform as number[] | undefined;
      const x = transform?.[4] ?? 0;
      const y = transform?.[5] ?? 0;
      const height =
        Math.abs(transform?.[3] ?? 0) ||
        Math.abs(rawItem.height ?? 0) ||
        12;

      items.push({
        str: rawItem.str,
        x,
        y,
        width: rawItem.width ?? 0,
        height,
        hasEOL: rawItem.hasEOL
      });
    }

    pages.push({ pageNumber: pageNum, items });

    if (pageNum % YIELD_EVERY_PAGES === 0) {
      await yieldToMainThread();
    }
  }

  const reconstructed = reconstructPdfDocument(pages);
  if (!reconstructed.text) {
    throw new PlynError('pdf_no_text');
  }

  const chapters = pdfOutlineToChapters(await readOutline(pdf), reconstructed);
  const fallbackTitle = titleFromFileName(file.name);
  return {
    title: metaTitle || fallbackTitle,
    text: reconstructed.text,
    ...(chapters.length >= 2 ? { chapters } : {})
  };
}
