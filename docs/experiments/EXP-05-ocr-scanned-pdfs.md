# EXP-05 OCR for scanned PDFs

Status: not started · Feeds: after [0.24](../ROADMAP.md#0240--pdfs-and-web-articles-import-well) · Time box: 2 days

## Question

Can offline OCR (for example Tesseract compiled to WebAssembly) read a scanned Ukrainian PDF on a mid-range phone, fast enough and with a download small enough to be worth it?

## Why it matters

Today a scanned PDF fails with `pdf_no_text`. Many school and university materials in Ukraine are scans. But OCR is heavy, and a slow, battery-draining import contradicts a calm experience.

## What we know

- Tesseract has Ukrainian and English trained data. The language data files are megabytes each; the engine WASM is also several megabytes. Exact sizes to be measured.
- Guess: 5–20 s per page on a phone. That makes a 200-page book impractical; a 5-page handout may be fine.
- Plyn invariant 7: OCR must be lazy-loaded only when used. Invariant 6: everything offline, so the data would be cached after first use.

## Plan

1. Measure download size (engine + `ukr` + `eng` data), gzip and brotli.
2. OCR 5 fixture pages (clean scan, phone photo, two-column, mixed Ukrainian/English, low contrast) on a mid-range Android phone and an iPhone.
3. Measure time per page, memory peak, and character accuracy against a hand-typed golden text.
4. Sketch the UI: explicit opt-in ("This is a scan. Recognize text? About N MB, once"), progress, cancel.

## Success criteria

- ≥ 95 % character accuracy on clean scans.
- ≤ 5 s per page on a mid-range phone.
- One-time download ≤ 15 MB, asked for explicitly.
- If any of these fail: decide "no" or "desktop only", and improve the `pdf_no_text` message instead.

## Constraints

- Never in the initial bundle or the precache; downloaded only after the reader agrees.
- Runs in a Web Worker; the UI stays responsive and the import can be cancelled.

## Result

## Decision
