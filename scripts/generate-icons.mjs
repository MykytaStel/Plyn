// Renders the PNG app icons from public/icons/icon.svg (IMP-16).
// Run: node scripts/generate-icons.mjs  (PW_CHROMIUM_EXECUTABLE for a local Chromium)
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
// The drawing without its rounded background, to place on a full-bleed square.
const glyph = svg.replace(/<rect width="512" height="512"[^>]*\/>/, '');

const fullBleed = (scale) =>
  glyph.replace(
    /<svg([^>]*)>/,
    `<svg$1><rect width="512" height="512" fill="#16181D"/><g transform="translate(256 256) scale(${scale}) translate(-256 -256)">`
  ).replace('</svg>', '</g></svg>');

const icons = [
  // `any`: the icon as drawn, with its rounded corners.
  { file: 'icon-192.png', size: 192, svg },
  { file: 'icon-512.png', size: 512, svg },
  // `maskable`: full bleed, the drawing inside the 80 % safe zone.
  { file: 'icon-maskable-512.png', size: 512, svg: fullBleed(0.78) },
  // iOS rounds the corners itself and fills transparency with black.
  { file: 'apple-touch-icon.png', size: 180, svg: fullBleed(0.9) }
];

const browser = await chromium.launch(
  process.env.PW_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } : {}
);
const page = await browser.newPage();
for (const icon of icons) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${icon.svg.replace(
      '<svg ',
      `<svg width="${icon.size}" height="${icon.size}" `
    )}</body></html>`
  );
  await page.screenshot({
    path: new URL(`../public/icons/${icon.file}`, import.meta.url).pathname,
    omitBackground: true
  });
  console.log(`public/icons/${icon.file}`);
}
await browser.close();
