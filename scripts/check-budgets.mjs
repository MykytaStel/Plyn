#!/usr/bin/env node
// Fails when the production build grows past scripts/budgets.json (0.25).
// Run after `npm run build`: `npm run budgets`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const assets = join(dist, 'assets');
const budgets = JSON.parse(readFileSync(join(root, 'scripts/budgets.json'), 'utf8'));

const kb = (bytes) => bytes / 1024;
const gz = (file) => kb(gzipSync(readFileSync(file), { level: 9 }).length);
/** `pdf-CvAQXJ06.js` → `pdf`; `pdf.worker.min-CIqJB0yW.mjs` → `pdf.worker.min`. */
const baseName = (file) => file.replace(/-[\w-]{8}\.(m?js|css)$/, '');

let html;
try {
  html = readFileSync(join(dist, 'index.html'), 'utf8');
} catch {
  console.error('No dist/index.html: run `npm run build` first.');
  process.exit(2);
}
const entryJs = html.match(/<script[^>]+src="\.?\/?assets\/([^"]+\.js)"/)?.[1];
const entryCss = html.match(/<link[^>]+rel="stylesheet"[^>]+href="\.?\/?assets\/([^"]+\.css)"/)?.[1];

const rows = [];
const check = (name, size, limit) => rows.push({ name, size, limit, ok: size <= limit });

for (const file of readdirSync(assets)) {
  const path = join(assets, file);
  if (/\.(woff2?|ttf|otf)$/.test(file)) continue;
  if (!/\.(m?js|css)$/.test(file)) continue;
  const size = gz(path);
  if (file === entryJs) check(`${file} (entry JS)`, size, budgets.entryJs);
  else if (file === entryCss) check(`${file} (entry CSS)`, size, budgets.entryCss);
  else if (budgets.named[baseName(file)] !== undefined) check(file, size, budgets.named[baseName(file)]);
  else check(`${file} (lazy)`, size, budgets.lazyChunk);
}

const fonts = readdirSync(assets)
  .filter((f) => /\.(woff2?|ttf|otf)$/.test(f))
  .reduce((sum, f) => sum + kb(statSync(join(assets, f)).size), 0);
check('fonts (all files, raw)', fonts, budgets.fontsTotal);

if (!entryJs || !entryCss) {
  console.error('Could not find the entry script or stylesheet in dist/index.html.');
  process.exit(2);
}

const width = Math.max(...rows.map((r) => r.name.length));
for (const r of rows.sort((a, b) => b.size - a.size)) {
  console.log(
    `${r.ok ? '✓' : '✗'} ${r.name.padEnd(width)}  ${r.size.toFixed(1).padStart(7)} KB / ${r.limit} KB`
  );
}
const over = rows.filter((r) => !r.ok);
if (over.length > 0) {
  console.error(`\n${over.length} budget(s) exceeded. See scripts/budgets.json.`);
  process.exit(1);
}
console.log('\nAll size budgets met.');
