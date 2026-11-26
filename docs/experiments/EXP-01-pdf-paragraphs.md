# EXP-01 PDF paragraph reconstruction

Status: not started · Feeds: [0.24](../ROADMAP.md#0240--pdfs-and-web-articles-import-well) · Time box: 2 days

## Question

Using only pdf.js text items (string, position, font size), can we rebuild paragraphs, join words hyphenated across lines, and drop running headers, footers and page numbers, well enough that readers don't notice the PDF origin?

## Why it matters

Today `src/core/parsers/pdf.ts` joins all text items of a page with spaces. Every page becomes one long paragraph, page numbers and headers end up mid-sentence, and `сло-` / `во` stays broken. Cards then cut through these artifacts, which is exactly the visual noise Plyn is meant to remove.

## What we know

- `page.getTextContent()` returns items with `str`, `transform` (x, y), `width`, `height`, `hasEOL`.
- Line breaks can be inferred from y changes; paragraph breaks from larger vertical gaps or first-line indents.
- Headers and footers repeat on most pages at the same y position.
- Guess: two-column scientific PDFs will be the hardest case. They may be out of scope.

## Plan

1. Collect 10 public-domain or self-made PDFs: a novel, a textbook chapter, a two-column paper, a scanned-and-OCRed file, a Ukrainian government document, an English article, a PDF with footnotes.
2. Write the expected plain text by hand for 2 pages of each (the golden files).
3. Write `reconstructParagraphs(items)` as a pure function (future home: `src/core/parsers/pdfLayout.ts`) with rules for lines, paragraphs, hyphenation, repeated headers/footers.
4. Score each file: share of paragraph breaks that match the golden file; count of leftover page numbers and broken words.
5. Measure the time on a 300-page book on a mid-range phone.

## Success criteria

- ≥ 90 % paragraph breaks correct on single-column files.
- Zero leftover page numbers and running headers on the fixture set.
- ≥ 95 % of line-end hyphenations joined, with no false joins of real compound words (Ukrainian uses hyphens: `науково-технічний`).
- A 300-page book processes in < 3 s on a mid-range phone.

## Constraints

- Pure logic in `src/core/` (no DOM, no pdf.js import there), so it is L1-testable.
- pdf.js stays lazy-loaded (invariant 7).
- Progress offsets refer to the normalized text: once shipped, a re-import of the same PDF produces different text, so old progress for PDFs may move. Decide how to handle that (see Decision).

## Result

## Decision
