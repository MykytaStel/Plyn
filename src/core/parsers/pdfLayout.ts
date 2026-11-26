/**
 * Pure PDF paragraph reconstruction from positioned text items (EXP-01, 0.24).
 * Zero DOM and zero pdf.js imports so it is L1-testable and portable to native apps.
 */

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL?: boolean;
}

export interface PdfPageItems {
  pageNumber: number;
  items: PdfTextItem[];
}

interface VisualLine {
  text: string;
  x: number;
  rightX: number;
  y: number;
  fontSize: number;
}

const STANDALONE_PAGE_NUM =
  /^\s*(?:[-–—]\s*)?(?:(?:page|p\.|стр\.|стор\.)\s*)?\d{1,5}(?:\s*[/\\]\s*\d{1,5})?(?:\s*[-–—])?\s*$/i;

const TERMINAL_PUNCT = /[.!?…»”)"']\s*$/;

const LOWERCASE_START = /^[a-zа-яіїєґ]/;

/** Known Ukrainian and English compound prefixes where a line-end hyphen is part of the word. */
const COMPOUND_PREFIXES = new Set([
  'науково',
  'суспільно',
  'соціально',
  'культурно',
  'історично',
  'фінансово',
  'технічно',
  'військово',
  'державно',
  'інтернет',
  'веб',
  'онлайн',
  'офлайн',
  'віце',
  'екс',
  'міні',
  'макро',
  'мікро',
  'пів',
  'по',
  'будь',
  'казна',
  'хтозна',
  'self',
  'well',
  'non',
  'pre',
  'post',
  'anti',
  'co',
  're',
  'multi',
  'cross',
  'e'
]);

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function normalizeHeaderKey(text: string): string {
  return text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Groups positioned pdf.js text items on a single page into visual lines
 * sorted top-to-bottom (descending y) and left-to-right (ascending x).
 */
export function groupItemsIntoLines(items: PdfTextItem[]): VisualLine[] {
  const nonEmpty = items.filter((item) => item.str.trim().length > 0);
  if (nonEmpty.length === 0) return [];

  const heights = nonEmpty.map((i) => i.height).filter((h) => h > 0);
  const baseFontSize = median(heights) || 12;
  const yTolerance = Math.max(2, baseFontSize * 0.45);

  const sorted = [...nonEmpty].sort((a, b) => {
    if (Math.abs(a.y - b.y) > yTolerance) return b.y - a.y;
    return a.x - b.x;
  });

  const buckets: PdfTextItem[][] = [];
  for (const item of sorted) {
    const lastBucket = buckets[buckets.length - 1];
    if (lastBucket && Math.abs(lastBucket[0].y - item.y) <= yTolerance) {
      lastBucket.push(item);
    } else {
      buckets.push([item]);
    }
  }

  return buckets
    .map((bucket) => {
      bucket.sort((a, b) => a.x - b.x);
      let text = '';
      let prevRight = bucket[0].x;
      const lineHeight =
        median(bucket.map((i) => i.height).filter((h) => h > 0)) || baseFontSize;

      for (let i = 0; i < bucket.length; i += 1) {
        const item = bucket[i];
        const piece = item.str.replace(/[ \t]+/g, ' ');
        if (i === 0) {
          text = piece.trimStart();
        } else {
          const gap = item.x - prevRight;
          const needsSpace =
            gap > lineHeight * 0.16 &&
            !text.endsWith(' ') &&
            !piece.startsWith(' ');
          text += needsSpace ? ` ${piece.trimStart()}` : piece;
        }
        prevRight = Math.max(prevRight, item.x + Math.max(0, item.width));
      }

      return {
        text: text.replace(/\s+/g, ' ').trim(),
        x: bucket[0].x,
        rightX: prevRight,
        y: bucket[0].y,
        fontSize: lineHeight
      };
    })
    .filter((line) => line.text.length > 0);
}

/**
 * Joins two consecutive lines inside the same paragraph, safely rejoining
 * words split across lines with a hyphen while keeping real compound words.
 */
export function joinParagraphLines(prev: string, next: string): string {
  const left = prev.trimEnd();
  const right = next.trimStart();
  if (!left) return right;
  if (!right) return left;

  // Soft hyphen always joins directly
  if (left.endsWith('\u00AD')) {
    return `${left.slice(0, -1)}${right}`;
  }

  // Line-end hyphenation: letter + hyphen at end, lowercase letter at start of next line
  const hyphenMatch = /([A-Za-zА-Яа-яІіЇїЄєҐґ]+)[-\u2010]$/.exec(left);
  if (hyphenMatch && LOWERCASE_START.test(right)) {
    const stem = hyphenMatch[1].toLowerCase();
    if (COMPOUND_PREFIXES.has(stem)) {
      return `${left}${right}`;
    }
    return `${left.slice(0, -1)}${right}`;
  }

  return `${left} ${right}`;
}

/**
 * Removes repeated running headers/footers across pages and standalone page numbers.
 */
function stripHeadersFootersAndPageNumbers(
  pageLines: VisualLine[][]
): VisualLine[][] {
  const pageCount = pageLines.length;
  const topCounts = new Map<string, number>();
  const bottomCounts = new Map<string, number>();

  if (pageCount >= 2) {
    for (const lines of pageLines) {
      if (lines.length === 0) continue;
      const topKey = normalizeHeaderKey(lines[0].text);
      if (topKey && topKey.length <= 100) {
        topCounts.set(topKey, (topCounts.get(topKey) ?? 0) + 1);
      }
      if (lines.length >= 2) {
        const bottomKey = normalizeHeaderKey(lines[lines.length - 1].text);
        if (bottomKey && bottomKey.length <= 100) {
          bottomCounts.set(bottomKey, (bottomCounts.get(bottomKey) ?? 0) + 1);
        }
      }
    }
  }

  const minRepeats = Math.max(2, Math.ceil(pageCount * 0.5));

  return pageLines.map((lines) => {
    if (lines.length === 0) return [];
    let start = 0;
    let end = lines.length;

    // Check top edge (up to 2 lines for header + page number)
    while (start < end && start < 2) {
      const candidate = lines[start].text;
      const key = normalizeHeaderKey(candidate);
      const isRepeatedHeader =
        pageCount >= 2 && (topCounts.get(key) ?? 0) >= minRepeats;
      if (STANDALONE_PAGE_NUM.test(candidate) || isRepeatedHeader) {
        start += 1;
      } else {
        break;
      }
    }

    // Check bottom edge (up to 2 lines for footer + page number)
    let bottomChecked = 0;
    while (end > start && bottomChecked < 2) {
      const candidate = lines[end - 1].text;
      const key = normalizeHeaderKey(candidate);
      const isRepeatedFooter =
        pageCount >= 2 && (bottomCounts.get(key) ?? 0) >= minRepeats;
      if (STANDALONE_PAGE_NUM.test(candidate) || isRepeatedFooter) {
        end -= 1;
        bottomChecked += 1;
      } else {
        break;
      }
    }

    return lines.slice(start, end);
  });
}

/**
 * Reconstructs clean paragraphs from positioned pdf.js page items.
 */
export function reconstructPdfText(pages: PdfPageItems[]): string {
  const rawPageLines = pages.map((page) => groupItemsIntoLines(page.items));
  const cleanedPages = stripHeadersFootersAndPageNumbers(rawPageLines);

  const allLines = cleanedPages.flat();
  if (allLines.length === 0) return '';

  const bodyFontSize =
    median(allLines.map((l) => l.fontSize).filter((s) => s > 0)) || 12;

  const leftMargins = allLines.map((l) => Math.round(l.x));
  const sortedMargins = [...leftMargins].sort((a, b) => a - b);
  const bodyLeftX = sortedMargins[Math.floor(sortedMargins.length * 0.25)] ?? 0;

  const lineWidths = allLines
    .map((l) => l.rightX - l.x)
    .filter((w) => w > 0);
  const typicalWidth =
    lineWidths.length > 0
      ? [...lineWidths].sort((a, b) => a - b)[
          Math.floor(lineWidths.length * 0.8)
        ]
      : 0;

  const verticalGaps: number[] = [];
  for (const lines of cleanedPages) {
    for (let i = 1; i < lines.length; i += 1) {
      const prev = lines[i - 1];
      const curr = lines[i];
      if (
        prev.fontSize >= bodyFontSize * 1.22 ||
        curr.fontSize >= bodyFontSize * 1.22
      ) {
        continue;
      }
      const gap = prev.y - curr.y;
      if (gap > 0 && gap < bodyFontSize * 4) {
        verticalGaps.push(gap);
      }
    }
  }
  const sortedGaps = [...verticalGaps].sort((a, b) => a - b);
  const normalLineGap =
    sortedGaps.length > 0
      ? sortedGaps[Math.floor(sortedGaps.length * 0.25)]
      : bodyFontSize * 1.3;

  const paragraphs: string[] = [];
  let currentParagraph = '';

  for (let pIdx = 0; pIdx < cleanedPages.length; pIdx += 1) {
    const lines = cleanedPages[pIdx];
    if (lines.length === 0) continue;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const isHeading = line.fontSize >= bodyFontSize * 1.22;

      if (!currentParagraph) {
        currentParagraph = line.text;
        if (isHeading) {
          paragraphs.push(currentParagraph);
          currentParagraph = '';
        }
        continue;
      }

      if (i === 0) {
        // Cross-page boundary: merge if previous paragraph didn't finish a sentence
        // or ended with a hyphen, and the new page starts mid-sentence.
        const endsWithHyphen = /[-\u2010\u00AD]$/.test(currentParagraph);
        const endsWithTerminal = TERMINAL_PUNCT.test(currentParagraph);
        const startsLower = LOWERCASE_START.test(line.text);
        const shouldContinueAcrossPage =
          !isHeading && (endsWithHyphen || (!endsWithTerminal && startsLower));

        if (shouldContinueAcrossPage) {
          currentParagraph = joinParagraphLines(currentParagraph, line.text);
        } else {
          paragraphs.push(currentParagraph);
          currentParagraph = line.text;
          if (isHeading) {
            paragraphs.push(currentParagraph);
            currentParagraph = '';
          }
        }
        continue;
      }

      const prevLine = lines[i - 1];
      const prevWasHeading = prevLine.fontSize >= bodyFontSize * 1.22;
      const gap = prevLine.y - line.y;
      const hasLargeGap = gap > normalLineGap * 1.38;
      const hasIndent = line.x - bodyLeftX >= bodyFontSize * 0.85;
      const prevWidth = prevLine.rightX - prevLine.x;
      const prevLooksShort =
        typicalWidth > 0 && prevWidth > 0 && prevWidth < typicalWidth * 0.72;
      const prevEndedSentence = TERMINAL_PUNCT.test(prevLine.text);

      const startNewParagraph =
        isHeading ||
        prevWasHeading ||
        hasLargeGap ||
        (hasIndent && prevEndedSentence) ||
        (prevLooksShort && prevEndedSentence);

      if (startNewParagraph) {
        paragraphs.push(currentParagraph);
        currentParagraph = line.text;
        if (isHeading) {
          paragraphs.push(currentParagraph);
          currentParagraph = '';
        }
      } else {
        currentParagraph = joinParagraphLines(currentParagraph, line.text);
      }
    }
  }

  if (currentParagraph) {
    paragraphs.push(currentParagraph);
  }

  return paragraphs
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}
