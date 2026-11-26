import { strFromU8, unzipSync } from 'fflate';
import { PlynError } from '../errors';

export interface ParsedEpub {
  title: string;
  text: string;
}

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

function extractReadableTextFromXhtml(xhtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xhtml, 'application/xhtml+xml');
  const body = doc.querySelector('body') || parser.parseFromString(xhtml, 'text/html').body;
  if (!body) return '';

  body.querySelectorAll('script, style, nav, svg').forEach((el) => el.remove());

  const blocks = body.querySelectorAll('p, h1, h2, h3, h4, li, blockquote');
  if (blocks.length > 0) {
    return Array.from(blocks)
      .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n\n');
  }

  return (body.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Локально розпаковує та парсить .epub у чистий текст і заголовок прямо в браузері.
 */
export async function parseEpubFile(file: File): Promise<ParsedEpub> {
  const buffer = await file.arrayBuffer();
  const files = unzipSync(new Uint8Array(buffer));

  const containerBytes = files['META-INF/container.xml'];
  if (!containerBytes) {
    throw new PlynError('epub_invalid');
  }

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(strFromU8(containerBytes), 'application/xml');
  const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
  if (!opfPath || !files[opfPath]) {
    throw new PlynError('epub_no_manifest');
  }

  const opfDoc = parser.parseFromString(strFromU8(files[opfPath]), 'application/xml');
  const titleEl =
    opfDoc.querySelector('metadata title') ||
    opfDoc.getElementsByTagNameNS('*', 'title')[0];
  const fallbackName = file.name.replace(/\.epub$/i, '');
  const title = (titleEl?.textContent || '').trim() || fallbackName;

  const manifestMap = new Map<string, string>();
  opfDoc.querySelectorAll('manifest item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) {
      manifestMap.set(id, resolveRelativePath(opfPath, decodeURIComponent(href)));
    }
  });

  const spineIds = Array.from(opfDoc.querySelectorAll('spine itemref'))
    .map((ref) => ref.getAttribute('idref'))
    .filter((id): id is string => Boolean(id));

  const sections: string[] = [];
  for (const id of spineIds) {
    const path = manifestMap.get(id);
    if (!path || !files[path]) continue;
    const rawXhtml = strFromU8(files[path]);
    const text = extractReadableTextFromXhtml(rawXhtml);
    if (text) sections.push(text);
  }

  const fullText = sections.join('\n\n').trim();
  if (!fullText) {
    throw new PlynError('epub_no_text');
  }

  return { title, text: fullText };
}
