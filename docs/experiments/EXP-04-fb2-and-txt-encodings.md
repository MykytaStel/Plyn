# EXP-04 FB2 and plain-text encodings

Status: not started · Feeds: [0.23](../ROADMAP.md#0230--books-import-well) · Time box: 1 day

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

## Decision
