// Builds the self-written book fixtures in spec/parsers/books/ (0.23).
// Run once from the repository root: node scripts/fixtures/build-book-fixtures.mjs
// The expected output in spec/parsers/books.json is written by hand, not by this script.
// Never change a published fixture: add a new one instead.
import { writeFileSync } from 'node:fs';
import { strToU8, zipSync } from 'fflate';

const OUT = 'spec/parsers/books';
const CONTAINER = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;
const xhtml = (body) => `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>x</title></head>
<body>${body}</body></html>`;
const epub = (files) =>
  zipSync({
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(CONTAINER),
    ...Object.fromEntries(Object.entries(files).map(([p, t]) => [p, strToU8(t)]))
  });

// EPUB 3: nested nav, two chapters inside one file reached by #fragment, two authors.
writeFileSync(`${OUT}/epub3-nav-fragments.epub`, epub({
  'OEBPS/content.opf': `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Тиха книга</dc:title>
    <dc:creator>Марта Вигадана</dc:creator>
    <dc:creator>Остап Уявний</dc:creator>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="p1" href="text/part%201.xhtml" media-type="application/xhtml+xml"/>
    <item id="p2" href="text/part2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="p1"/><itemref idref="p2"/></spine>
</package>`,
  'OEBPS/nav.xhtml': xhtml(`<nav epub:type="landmarks"><ol><li><a href="text/part2.xhtml">Не зміст</a></li></ol></nav>
<nav epub:type="toc"><h1>Зміст</h1><ol>
  <li><a href="text/part%201.xhtml">Частина перша</a>
    <ol>
      <li><a href="text/part%201.xhtml#ch1">Розділ 1</a></li>
      <li><a href="text/part%201.xhtml#ch2">Розділ 2</a></li>
    </ol>
  </li>
  <li><a href="text/part2.xhtml">Частина друга</a></li>
</ol></nav>`),
  'OEBPS/text/part 1.xhtml': xhtml(`<h1>Частина перша</h1>
<h2 id="ch1">Розділ 1</h2><p>Ранок був   тихий.</p><p></p>
<section id="ch2"><h2>Розділ 2</h2><p>Пішов дощ.</p></section>`),
  'OEBPS/text/part2.xhtml': xhtml(`<h1>Частина друга</h1><blockquote><p>Цитата.</p></blockquote><p>Кінець.</p>`)
}));

// EPUB 2: NCX with a nested navPoint, spine toc attribute, one author.
writeFileSync(`${OUT}/epub2-ncx.epub`, epub({
  'OEBPS/content.opf': `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>A Small Book</dc:title>
    <dc:creator>Ada Example</dc:creator>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="c2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx"><itemref idref="c1"/><itemref idref="c2"/></spine>
</package>`,
  'OEBPS/toc.ncx': `<?xml version="1.0"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap>
  <navPoint id="n1" playOrder="1"><navLabel><text>One</text></navLabel><content src="c1.xhtml"/>
    <navPoint id="n1a" playOrder="2"><navLabel><text>One, later</text></navLabel><content src="c1.xhtml#later"/></navPoint>
  </navPoint>
  <navPoint id="n2" playOrder="3"><navLabel><text>Two</text></navLabel><content src="c2.xhtml"/></navPoint>
</navMap></ncx>`,
  'OEBPS/c1.xhtml': xhtml(`<h1>One</h1><p>The kettle sang.</p><p id="later">Later, the rain.</p>`),
  'OEBPS/c2.xhtml': xhtml(`<h1>Two</h1><ul><li><p>First thing.</p></li><li>Second thing.</li></ul>`)
}));

// FB2 in Windows-1251 (declared in the prolog), nested sections, epigraph, poem, notes body.
const fb2 = (encoding) => `<?xml version="1.0" encoding="${encoding}"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description><title-info>
    <author><first-name>Марта</first-name><last-name>Вигадана</last-name></author>
    <book-title>Вечір над річкою</book-title>
    <lang>uk</lang>
  </title-info></description>
  <body>
    <title><p>Вечір над річкою</p></title>
    <epigraph><p>Тиша теж говорить.</p></epigraph>
    <section>
      <title><p>Частина перша</p></title>
      <section>
        <title><p>Розділ 1</p><p>Берег</p></title>
        <p>Вода була теплою.</p>
        <empty-line/>
        <poem><stanza><v>Ой, у полі</v><v>вітер віє.</v></stanza></poem>
      </section>
      <section>
        <title><p>Розділ 2</p></title>
        <p>Їжак  прийшов<a l:href="#n1">1</a> увечері.</p>
      </section>
    </section>
    <section><p>Без назви, але з текстом.</p></section>
  </body>
  <body name="notes"><section id="n1"><p>Примітка, яку не читаємо в тексті.</p></section></body>
</FictionBook>`;
function enc1251(text) {
  const dec = new TextDecoder('windows-1251');
  const map = new Map();
  for (let b = 0; b < 256; b++) { const ch = dec.decode(new Uint8Array([b])); if (!map.has(ch)) map.set(ch, b); }
  return Uint8Array.from([...text].map((ch) => { const b = map.get(ch); if (b === undefined) throw new Error(ch); return b; }));
}
writeFileSync(`${OUT}/fb2-windows-1251.fb2`, enc1251(fb2('windows-1251')));
writeFileSync(`${OUT}/fb2-utf8.fb2.zip`, zipSync({ 'book.fb2': strToU8(fb2('utf-8')) }));
