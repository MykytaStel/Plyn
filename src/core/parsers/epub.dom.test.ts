import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { PlynError } from '../errors';
import { parseEpubFile } from './epub';

/** Self-written fixtures (TESTING.md rule 3): a minimal EPUB 2 and EPUB 3 built in memory. */
const CONTAINER = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

function chapter(body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title><style>p{}</style></head>
<body>${body}</body></html>`;
}

function opf(version: '2.0' | '3.0', title: string | null): string {
  const meta = title ? `<dc:title>${title}</dc:title>` : '';
  return `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="${version}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">${meta}</metadata>
  <manifest>
    ${version === '3.0' ? '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>' : ''}
    <item id="c1" href="text/ch%201.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="c2"/><itemref idref="c1"/><itemref idref="missing"/></spine>
</package>`;
}

function epubFile(files: Record<string, string>, name = 'my_book.epub'): File {
  const zipped = zipSync(
    Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)]))
  );
  return new File([zipped], name, { type: 'application/epub+zip' });
}

function book(version: '2.0' | '3.0', title: string | null) {
  return epubFile({
    'META-INF/container.xml': CONTAINER,
    'OEBPS/content.opf': opf(version, title),
    'OEBPS/nav.xhtml': chapter('<nav><ol><li>Contents</li></ol></nav>'),
    'OEBPS/text/ch 1.xhtml': chapter('<h1>Chapter one</h1><p>First   paragraph.</p><script>alert(1)</script>'),
    'OEBPS/text/ch2.xhtml': chapter('<p>Opening line.</p><ul><li>An item</li></ul>')
  });
}

describe('parseEpubFile', () => {
  it.each(['2.0', '3.0'] as const)('reads EPUB %s chapters in spine order', async (version) => {
    const parsed = await parseEpubFile(book(version, 'A Calm Book'));

    expect(parsed.title).toBe('A Calm Book');
    expect(parsed.text).toBe(
      ['Opening line.', 'An item', 'Chapter one', 'First paragraph.'].join('\n\n')
    );
  });

  it('falls back to the file name when the book has no title', async () => {
    const parsed = await parseEpubFile(book('3.0', null));
    expect(parsed.title).toBe('my book');
  });

  it('rejects a file without a container', async () => {
    await expect(parseEpubFile(epubFile({ 'x.txt': 'hi' }))).rejects.toMatchObject({
      code: 'epub_invalid'
    });
  });

  it('rejects a book without readable text', async () => {
    const empty = epubFile({
      'META-INF/container.xml': CONTAINER,
      'OEBPS/content.opf': opf('2.0', 'Empty'),
      'OEBPS/text/ch 1.xhtml': chapter(''),
      'OEBPS/text/ch2.xhtml': chapter('<script>x</script>')
    });
    const error = await parseEpubFile(empty).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PlynError);
    expect((error as PlynError).code).toBe('epub_no_text');
  });
});
