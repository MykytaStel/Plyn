# EXP-01 PDF paragraph reconstruction

Status: decided (yes) · Feeds: [0.24](../ROADMAP.md#0240--pdfs-and-web-articles-import-well) · Time box: 2 days

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

1. Collect representative single-column PDF layouts: a novel with first-line indents, a textbook with headings and running headers/footers, a Ukrainian document with line-end hyphenations and real compound words (`науково-технічний`), an English article with blank-line paragraph gaps, and multi-page text continuing mid-sentence across a page break.
2. Write expected plain text as golden fixtures in `spec/parsers/pdf-cases.json`.
3. Write `reconstructPdfText(pages)` as a pure function in `src/core/parsers/pdfLayout.ts` (zero DOM, zero pdf.js imports) with rules for visual line grouping, repeated header/footer and standalone page-number stripping, paragraph gap/indent detection, cross-page sentence joining, and safe hyphenation joining.
4. Score every fixture against the golden expected output and benchmark on a synthetic 300-page book.

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

- Implemented pure `reconstructPdfText(pages)` in `src/core/parsers/pdfLayout.ts` and verified against golden fixtures in `spec/parsers/pdf-cases.json` (novel with indents, running headers/footers, standalone page numbers, Ukrainian & English hyphenation + compound preservation, headings, and cross-page sentence continuation).
- All fixture cases match 100 % of expected paragraph breaks with zero leftover page numbers or running headers, and preserve genuine Ukrainian/English compound hyphens (`науково-технічний`, `well-known`).
- Synthetic 300-page PDF layout (~9,000 lines) processes in well under 50 ms in pure JS, leaving plenty of headroom on mid-range phones while yielding between pages during pdf.js extraction.

## Decision

**Ship in 0.24.0** for single-column PDFs. Two-column academic layouts remain explicitly out of scope for 0.24. Existing already-imported PDFs in Dexie keep their stored `text` and `charOffset` untouched, so readers never lose their place; only newly imported PDFs use the reconstructed text.
