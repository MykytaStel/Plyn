import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedPdf {
  title: string;
  text: string;
}

/**
 * Локально витягує текст із PDF-документа (підвантажується ліниво лише при імпорті .pdf).
 */
export async function parsePdfFile(file: File): Promise<ParsedPdf> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) pages.push(pageText);
  }

  const fullText = pages.join('\n\n').trim();
  if (!fullText) {
    throw new Error(
      'У цьому PDF немає текстового шару (можливо, це відскановані зображення).'
    );
  }

  const fallbackTitle = file.name.replace(/\.pdf$/i, '');
  return { title: fallbackTitle, text: fullText };
}
