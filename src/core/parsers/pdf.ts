import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PlynError } from '../errors';
import { titleFromFileName } from './fileName';
import {
  reconstructPdfText,
  type PdfPageItems,
  type PdfTextItem
} from './pdfLayout';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedPdf {
  title: string;
  text: string;
}

const YIELD_EVERY_PAGES = 10;

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
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

  const fullText = reconstructPdfText(pages);
  if (!fullText) {
    throw new PlynError('pdf_no_text');
  }

  const fallbackTitle = titleFromFileName(file.name);
  return { title: metaTitle || fallbackTitle, text: fullText };
}
