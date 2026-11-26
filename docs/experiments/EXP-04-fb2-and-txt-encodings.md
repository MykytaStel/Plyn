# EXP-04 FB2 and plain-text encodings

Status: done · 2026-11-26 · Feeds: [0.23](../ROADMAP.md#0230--books-import-well) · Time box: 1 day

## Question

1. Do Plyn's readers actually have books in FB2 (FictionBook), common in Ukrainian e-book libraries?
2. Can we reliably detect the encoding of old `.txt` files (UTF-8, UTF-16, Windows-1251, KOI8-U) without a heavy library?

## Why it matters

A reader who drops a book and sees `Ð¿Ñ€Ð¸Ð²Ñ–Ñ‚` or "unsupported file" leaves. Both formats are cheap to support if the answer is yes, and pure clutter in the import flow if nobody uses them.

## What we know

- FB2 is XML: `<description>` holds title and author, `<body>` holds `<section>` and `<p>`. `DOMParser` can parse it, like the EPUB parser does. `.fb2.zip` is common too, and `fflate` is already a dependency.
- `TextDecoder` in browsers supports `windows-1251`, `koi8-u` and `utf-16le`.
- Encoding detection can use a BOM check, then try UTF-8 in `fatal` mode, then score candidates by the share of common Cyrillic letters.

## Plan

1. Ask early readers (or check public Ukrainian e-book libraries) which formats they offer. Write down the result.
2. Collect public-domain fixtures: one FB2, one `.fb2.zip`, `.txt` in each encoding.
3. Prototype `detectTextEncoding(bytes)` and measure on the fixtures plus 20 random Ukrainian and English texts re-encoded.
4. Prototype an FB2 parser that returns title, author, text and section offsets (same shape as EPUB chapters in 0.23).

## Success criteria

- Encoding detection is right on 100 % of fixtures and ≥ 95 % of the re-encoded set; when unsure it falls back to UTF-8 and the reader sees a calm hint.
- FB2 ships only if there is a real signal of demand (at least a few readers, or the main Ukrainian free libraries offer FB2 as a primary format).

## Constraints

- No new heavy dependency. Parsers stay in `src/core/parsers/` with tests.
- Large files parse off the main thread (0.23 item 5).

## Result

- Demand: FB2 is a primary download format in the big Ukrainian free e-book libraries, next to EPUB. No reader survey was run; the decision rests on that availability and on the low cost.
- Encoding detection (`src/core/parsers/textEncoding.ts`, no dependency): 9/9 fixtures in `spec/parsers/txt/` (UTF-8 with and without BOM, UTF-16 LE/BE with BOM, UTF-16 LE without BOM, Windows-1251, KOI8-U, English), and 400/400 generated Ukrainian texts re-encoded to Windows-1251 and KOI8-U (seeded property test). Unsure files fall back to UTF-8 with a calm hint.
- FB2 parser (`src/core/parsers/fb2.ts`): title, author, text and titled sections as chapters, in the same shape as EPUB chapters; `.fb2.zip` via fflate; footnote marks and the notes body are left out.

## Decision

Ship both in 0.23. `.fb2` is one more accepted extension, so the import flow gets no new control.
