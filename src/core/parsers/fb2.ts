import { PlynError } from '../errors';
import {
  cleanBlock,
  joinBlocks,
  yieldToMain,
  type ChapterMarker,
  type ParsedBook
} from './bookText';
import { titleFromFileName } from './fileName';
import { decodeTextBytes } from './textEncoding';
import { isZip, unzipBytes } from './unzip';

export type ParsedFb2 = ParsedBook;

const XLINK = 'http://www.w3.org/1999/xlink';

/** Elements whose text is one paragraph of the book. */
const PARAGRAPHS = new Set(['p', 'v', 'subtitle', 'text-author']);
/** Containers to walk into. */
const CONTAINERS = new Set(['epigraph', 'poem', 'stanza', 'cite', 'annotation']);
/** Bodies that are not the book itself. */
const SKIPPED_BODIES = new Set(['notes', 'comments', 'footnotes']);

function childrenNamed(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => c.localName === name);
}

function firstNamed(root: Document | Element, name: string): Element | undefined {
  return root.getElementsByTagNameNS('*', name)[0];
}

/**
 * FB2 says its encoding in the XML prolog (`encoding="windows-1251"` is common).
 * Without one, the bytes are detected like a .txt file.
 */
function decodeFb2(bytes: Uint8Array): string {
  const head = new TextDecoder('ascii').decode(bytes.subarray(0, 200));
  const declared = /<\?xml[^>]*encoding=["']([\w.-]+)["']/i.exec(head)?.[1];
  if (declared) {
    try {
      return new TextDecoder(declared.toLowerCase(), { ignoreBOM: false }).decode(bytes);
    } catch {
      // Unknown label: fall through to detection.
    }
  }
  return decodeTextBytes(bytes).text;
}

async function fb2Bytes(file: File): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isZip(bytes)) return bytes;
  const files = await unzipBytes(bytes);
  const name = Object.keys(files).find((n) => n.toLowerCase().endsWith('.fb2'));
  if (!name) throw new PlynError('fb2_invalid');
  return files[name];
}

function authorName(el: Element): string {
  const part = (name: string) => cleanBlock(childrenNamed(el, name)[0]?.textContent ?? '');
  const full = [part('first-name'), part('middle-name'), part('last-name')]
    .filter(Boolean)
    .join(' ');
  return full || part('nickname');
}

/**
 * Parses a FictionBook (.fb2 or .fb2.zip): title, author, text and a table
 * of contents from titled <section>s (0.23, EXP-04).
 */
export async function parseFb2File(file: File): Promise<ParsedFb2> {
  const xml = decodeFb2(await fb2Bytes(file));
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  if (!root || root.localName !== 'FictionBook' || doc.getElementsByTagName('parsererror').length) {
    throw new PlynError('fb2_invalid');
  }

  const titleInfo = firstNamed(doc, 'title-info');
  const title =
    cleanBlock((titleInfo && firstNamed(titleInfo, 'book-title')?.textContent) ?? '') ||
    titleFromFileName(file.name.replace(/\.zip$/i, ''));
  const authors = titleInfo
    ? childrenNamed(titleInfo, 'author').map(authorName).filter(Boolean)
    : [];
  const author = authors.length > 0 ? authors.join(', ') : undefined;

  // Footnote marks (<a l:href="#n1">1</a>) would glue digits to words.
  for (const link of Array.from(doc.getElementsByTagNameNS('*', 'a'))) {
    const href = link.getAttributeNS(XLINK, 'href') ?? link.getAttribute('l:href') ?? '';
    const mark = (link.textContent ?? '').trim();
    if (href.startsWith('#') && (link.getAttribute('type') === 'note' || /^[[(*]?\d*[\])*]?$/.test(mark))) {
      link.remove();
    }
  }

  const blocks: string[] = [];
  const markers: ChapterMarker[] = [];
  let sinceYield = 0;

  const pushBlock = (raw: string) => {
    const text = cleanBlock(raw);
    if (text) blocks.push(text);
  };

  const walk = async (el: Element, depth: number): Promise<void> => {
    for (const child of Array.from(el.children)) {
      const name = child.localName;
      if (name === 'section') {
        const heading = childrenNamed(child, 'title')[0];
        const headingText = heading
          ? childrenNamed(heading, 'p').map((p) => cleanBlock(p.textContent ?? '')).filter(Boolean).join('. ')
          : '';
        if (headingText) markers.push({ title: headingText, level: depth, blockIndex: blocks.length });
        await walk(child, depth + 1);
      } else if (name === 'title') {
        const lines = childrenNamed(child, 'p');
        if (lines.length > 0) lines.forEach((p) => pushBlock(p.textContent ?? ''));
        else pushBlock(child.textContent ?? '');
      } else if (PARAGRAPHS.has(name)) {
        pushBlock(child.textContent ?? '');
      } else if (CONTAINERS.has(name)) {
        await walk(child, depth);
      } else if (name === 'table') {
        for (const row of Array.from(child.getElementsByTagNameNS('*', 'tr'))) {
          pushBlock(Array.from(row.children).map((c) => c.textContent ?? '').join(' · '));
        }
      }
      // image, empty-line and anything unknown carry no reading text.

      sinceYield += 1;
      if (sinceYield >= 400) {
        sinceYield = 0;
        await yieldToMain();
      }
    }
  };

  for (const body of childrenNamed(root, 'body')) {
    if (SKIPPED_BODIES.has(body.getAttribute('name') ?? '')) continue;
    await walk(body, 0);
  }

  const { text, chapters } = joinBlocks(blocks, markers);
  if (!text) throw new PlynError('fb2_no_text');
  return { title, author, text, chapters };
}
