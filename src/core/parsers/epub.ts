import { strFromU8, type Unzipped } from 'fflate';
import { titleFromFileName } from './fileName';
import { PlynError } from '../errors';
import {
  cleanBlock,
  joinBlocks,
  yieldToMain,
  type ChapterMarker,
  type ParsedBook
} from './bookText';
import { unzipBytes } from './unzip';

export type ParsedEpub = ParsedBook;

/** Paragraph-like elements that become blocks of the reading text. */
const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, dt, dd, pre';

function resolveRelativePath(baseFilePath: string, relativeHref: string): string {
  const cleanHref = relativeHref.split('#')[0];
  const baseParts = baseFilePath.split('/').slice(0, -1);
  const relParts = cleanHref.split('/');

  for (const part of relParts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  return baseParts.join('/');
}

function safeDecode(href: string): string {
  try {
    return decodeURIComponent(href);
  } catch {
    return href;
  }
}

/** A table-of-contents link: which file, which anchor inside it. */
interface TocTarget {
  title: string;
  level: number;
  path: string;
  fragment: string | null;
}

function tocTarget(basePath: string, href: string, title: string, level: number): TocTarget {
  const [file, fragment] = safeDecode(href).split('#');
  return {
    title,
    level,
    path: file ? resolveRelativePath(basePath, file) : basePath,
    fragment: fragment || null
  };
}

function parseXml(parser: DOMParser, bytes: Uint8Array): Document {
  return parser.parseFromString(strFromU8(bytes), 'application/xml');
}

function byLocalName(root: ParentNode, name: string): Element[] {
  return Array.from((root as Element | Document).getElementsByTagNameNS('*', name));
}

function childrenByLocalName(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => c.localName === name);
}

/** EPUB 3: <nav epub:type="toc"> with nested <ol><li><a href>. */
function readNavToc(parser: DOMParser, files: Unzipped, navPath: string): TocTarget[] {
  const bytes = files[navPath];
  if (!bytes) return [];
  const doc = parser.parseFromString(strFromU8(bytes), 'application/xhtml+xml');
  const navs = byLocalName(doc, 'nav');
  const toc =
    navs.find((n) =>
      (n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') ?? n.getAttribute('epub:type') ?? '')
        .split(/\s+/)
        .includes('toc')
    ) ?? navs[0];
  if (!toc) return [];

  const out: TocTarget[] = [];
  const walk = (list: Element, level: number) => {
    for (const li of childrenByLocalName(list, 'li')) {
      const link = Array.from(li.children).find((c) => c.localName === 'a' || c.localName === 'span');
      const href = link?.getAttribute('href');
      if (link && href) {
        out.push(tocTarget(navPath, href, link.textContent ?? '', level));
      }
      for (const nested of childrenByLocalName(li, 'ol')) walk(nested, level + 1);
    }
  };
  for (const list of childrenByLocalName(toc, 'ol')) walk(list, 0);
  return out;
}

/** EPUB 2: toc.ncx with nested <navPoint>. */
function readNcxToc(parser: DOMParser, files: Unzipped, ncxPath: string): TocTarget[] {
  const bytes = files[ncxPath];
  if (!bytes) return [];
  const doc = parseXml(parser, bytes);
  const navMap = byLocalName(doc, 'navMap')[0];
  if (!navMap) return [];

  const out: TocTarget[] = [];
  const walk = (parent: Element, level: number) => {
    for (const point of childrenByLocalName(parent, 'navPoint')) {
      const label = byLocalName(point, 'text')[0]?.textContent ?? '';
      const src = childrenByLocalName(point, 'content')[0]?.getAttribute('src');
      if (src) out.push(tocTarget(ncxPath, src, label, level));
      walk(point, level + 1);
    }
  };
  walk(navMap, 0);
  return out;
}

/** Innermost paragraph-like elements of a chapter file, in reading order. */
function extractBlocks(parser: DOMParser, xhtml: string): Element[] {
  const doc = parser.parseFromString(xhtml, 'application/xhtml+xml');
  const body =
    doc.querySelector('body') ?? parser.parseFromString(xhtml, 'text/html').body;
  if (!body) return [];

  body.querySelectorAll('script, style, nav, svg').forEach((el) => el.remove());

  const all = Array.from(body.querySelectorAll(BLOCK_SELECTOR));
  // A <li> or <blockquote> that wraps <p>s would repeat their text: keep the inner ones.
  const blocks = all.filter((el) => !el.querySelector(BLOCK_SELECTOR));
  if (blocks.length > 0) return blocks;
  return cleanBlock(body.textContent ?? '') ? [body] : [];
}

/** Index of the first block at or after `target`, or -1 if none follows it. */
function firstBlockFrom(blocks: Element[], target: Element): number {
  return blocks.findIndex(
    (block) =>
      block === target ||
      target.contains(block) ||
      Boolean(target.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING)
  );
}

/**
 * Локально розпаковує та парсить .epub у чистий текст, назву, автора і зміст
 * прямо в браузері. Unzipping runs off the main thread; parsing yields between
 * chapter files so the screen keeps responding on a long book.
 */
export async function parseEpubFile(file: File): Promise<ParsedEpub> {
  const buffer = await file.arrayBuffer();
  const files = await unzipBytes(new Uint8Array(buffer));

  const containerBytes = files['META-INF/container.xml'];
  if (!containerBytes) {
    throw new PlynError('epub_invalid');
  }

  const parser = new DOMParser();
  const containerDoc = parseXml(parser, containerBytes);
  const opfPath = byLocalName(containerDoc, 'rootfile')[0]?.getAttribute('full-path');
  if (!opfPath || !files[opfPath]) {
    throw new PlynError('epub_no_manifest');
  }

  const opfDoc = parseXml(parser, files[opfPath]);
  const metadata = byLocalName(opfDoc, 'metadata')[0] ?? opfDoc;
  const title =
    cleanBlock(byLocalName(metadata, 'title')[0]?.textContent ?? '') ||
    titleFromFileName(file.name);
  const authors = byLocalName(metadata, 'creator')
    .map((el) => cleanBlock(el.textContent ?? ''))
    .filter(Boolean);
  const author = authors.length > 0 ? Array.from(new Set(authors)).join(', ') : undefined;

  const manifest = new Map<string, { path: string; mediaType: string; properties: string }>();
  for (const item of byLocalName(opfDoc, 'item')) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) {
      manifest.set(id, {
        path: resolveRelativePath(opfPath, safeDecode(href)),
        mediaType: item.getAttribute('media-type') ?? '',
        properties: item.getAttribute('properties') ?? ''
      });
    }
  }

  const spine = byLocalName(opfDoc, 'spine')[0];
  const spineIds = (spine ? byLocalName(spine, 'itemref') : [])
    .map((ref) => ref.getAttribute('idref'))
    .filter((id): id is string => Boolean(id));

  // Table of contents: EPUB 3 nav first, EPUB 2 NCX otherwise.
  const navItem = Array.from(manifest.values()).find((i) =>
    i.properties.split(/\s+/).includes('nav')
  );
  const ncxId = spine?.getAttribute('toc');
  const ncxItem =
    (ncxId ? manifest.get(ncxId) : undefined) ??
    Array.from(manifest.values()).find((i) => i.mediaType === 'application/x-dtbncx+xml');
  let toc = navItem ? readNavToc(parser, files, navItem.path) : [];
  if (toc.length === 0 && ncxItem) toc = readNcxToc(parser, files, ncxItem.path);

  const blocks: string[] = [];
  const markers: ChapterMarker[] = [];

  for (const id of spineIds) {
    const path = manifest.get(id)?.path;
    if (!path || !files[path]) continue;

    const fileStart = blocks.length;
    const elements = extractBlocks(parser, strFromU8(files[path]));
    const texts = elements.map((el) => cleanBlock(el.textContent ?? ''));

    // Where each TOC entry of this file lands, before empty blocks are dropped.
    const entryBlock = new Map<TocTarget, number>();
    for (const entry of toc) {
      if (entry.path !== path) continue;
      let local = 0;
      if (entry.fragment && elements.length > 0) {
        const target = elements[0].ownerDocument.getElementById(entry.fragment);
        if (target) {
          local = firstBlockFrom(elements, target);
          if (local === -1) local = elements.length;
        }
      }
      entryBlock.set(entry, local);
    }

    // Keep only non-empty blocks and remap the local indexes.
    const keptBefore: number[] = [];
    let kept = 0;
    texts.forEach((text, i) => {
      keptBefore[i] = kept;
      if (text) {
        blocks.push(text);
        kept += 1;
      }
    });
    keptBefore[texts.length] = kept;

    for (const [entry, local] of entryBlock) {
      markers.push({
        title: entry.title,
        level: entry.level,
        blockIndex: fileStart + keptBefore[Math.min(local, texts.length)]
      });
    }

    await yieldToMain();
  }

  // joinBlocks sorts by offset and keeps the TOC's order for ties (stable sort).
  const { text, chapters } = joinBlocks(blocks, markers);
  if (!text) {
    throw new PlynError('epub_no_text');
  }

  return { title, author, text, chapters };
}
