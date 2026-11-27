import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync } from 'fflate';

/**
 * Self-written fixtures only (TESTING.md rule 3). Everything is built in
 * memory. Since 0.23 the parser golden files in spec/parsers/ (self-written,
 * binary) are reused too.
 */

/** A Ukrainian text with numbered, unique sentences: easy to locate on a card. */
export function numberedText(sentences = 80): string {
  const out: string[] = [];
  for (let i = 1; i <= sentences; i += 1) {
    out.push(`Речення ${i} розповідає про спокійне читання короткими картками.`);
    if (i % 6 === 0) out.push('\n\n');
  }
  return out.join(' ').replace(/ \n\n /g, '\n\n');
}

export const EPUB_TITLE = 'Тиха книжка';
export const EPUB_FIRST_LINE = 'Перший абзац тихої книжки починається тут.';

export function epubFixture(): { name: string; mimeType: string; buffer: Buffer } {
  const container = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;
  const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${EPUB_TITLE}</dc:title></metadata>
  <manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest>
  <spine><itemref idref="c1"/></spine>
</package>`;
  const chapter = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>c1</title></head>
<body><p>${EPUB_FIRST_LINE}</p><p>Другий абзац теж короткий і спокійний.</p></body></html>`;
  const zipped = zipSync({
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(container),
    'OEBPS/content.opf': strToU8(opf),
    'OEBPS/c1.xhtml': strToU8(chapter)
  });
  return { name: 'quiet_book.epub', mimeType: 'application/epub+zip', buffer: Buffer.from(zipped) };
}

/** The PDF title comes from the file name (titleFromFileName). */
export const PDF_FILE_NAME = 'calm-notes.pdf';
export const PDF_TEXT = 'Plyn reads this PDF page calmly.';

/** A one-page PDF 1.4 with a real text layer and a correct xref table. */
export function pdfFixture(): { name: string; mimeType: string; buffer: Buffer } {
  const stream = `BT /F1 18 Tf 72 720 Td (${PDF_TEXT}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefAt = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) body += `${String(off).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return { name: PDF_FILE_NAME, mimeType: 'application/pdf', buffer: Buffer.from(body, 'latin1') };
}

/** Serializes PDF objects (1-based, in order) with a correct xref table. */
function buildPdf(objects: string[]): Buffer {
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefAt = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) body += `${String(off).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

export const OUTLINED_PDF_NAME = 'quiet-book.pdf';
export const OUTLINED_PDF_IMPRINT = 'ISBN 000-0-00-000000-0. Imprint Press, 2025.';
export const OUTLINED_PDF_CHAPTERS = ['Chapter One', 'Chapter Two'];

/**
 * A three-page PDF with its own outline (0.25): an imprint page, then two
 * chapters, each with a large heading and body text.
 */
export function outlinedPdfFixture(): { name: string; mimeType: string; buffer: Buffer } {
  const pageStream = (lines: Array<[number, string]>) =>
    lines
      .map(([size, text], i) => `BT /F1 ${size} Tf 72 ${720 - i * 30} Td (${text}) Tj ET`)
      .join('\n');
  const streams = [
    pageStream([[12, OUTLINED_PDF_IMPRINT]]),
    pageStream([
      [20, OUTLINED_PDF_CHAPTERS[0]],
      [12, 'The first chapter begins in a calm room.'],
      [12, 'It goes on for a while, quietly.']
    ]),
    pageStream([
      [20, OUTLINED_PDF_CHAPTERS[1]],
      [12, 'The second chapter opens by the sea.'],
      [12, 'Nothing hurries here either.']
    ])
  ];
  // 1 catalog, 2 pages, 3-5 page, 6-8 contents, 9 font, 10 outlines, 11-12 items.
  const page = (contents: number) =>
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contents} 0 R /Resources << /Font << /F1 9 0 R >> >> >>`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R /Outlines 10 0 R /PageMode /UseOutlines >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>',
    page(6),
    page(7),
    page(8),
    ...streams.map((st) => `<< /Length ${st.length} >>\nstream\n${st}\nendstream`),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Outlines /First 11 0 R /Last 12 0 R /Count 2 >>',
    `<< /Title (${OUTLINED_PDF_CHAPTERS[0]}) /Parent 10 0 R /Next 12 0 R /Dest [4 0 R /XYZ null null null] >>`,
    `<< /Title (${OUTLINED_PDF_CHAPTERS[1]}) /Parent 10 0 R /Prev 11 0 R /Dest [5 0 R /XYZ null null null] >>`
  ];
  return { name: OUTLINED_PDF_NAME, mimeType: 'application/pdf', buffer: buildPdf(objects) };
}

/** A golden-file book from spec/parsers (self-written, 0.23). */
export function specBook(name: string): { name: string; mimeType: string; buffer: Buffer } {
  const path = fileURLToPath(new URL(`../../spec/parsers/${name}`, import.meta.url));
  return { name: name.split('/').pop()!, mimeType: 'application/octet-stream', buffer: readFileSync(path) };
}
