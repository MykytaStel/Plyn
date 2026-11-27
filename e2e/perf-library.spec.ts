import { expect, test, uk } from './support/app';

/**
 * 0.25 "done when": a library of 50 books renders in under 300 ms on a
 * throttled phone profile. The list reads light rows only (IMP-06), so the
 * size of the books does not matter. Chromium only: CPU throttling needs CDP.
 */
const BOOKS = 50;
const BOOK_CHARS = 200_000;
const BUDGET_MS = 300;
const CPU_SLOWDOWN = 4;

function backupWithBooks(): string {
  const sentence = 'Спокійне речення книжки для перевірки швидкості бібліотеки. ';
  const body = sentence.repeat(Math.ceil(BOOK_CHARS / sentence.length)).slice(0, BOOK_CHARS);
  const now = Date.now();
  const documents = Array.from({ length: BOOKS }, (_, i) => ({
    id: `perf-${i}`,
    schemaVersion: 1,
    title: `Книжка ${i + 1}`,
    text: `${i}. ${body}`,
    charOffset: 0,
    currentIndex: 0,
    totalCards: 1000,
    bookmarkOffsets: [],
    bookmarkNotes: {},
    completedOnce: false,
    createdAt: now - i,
    updatedAt: now - i
  }));
  return JSON.stringify({ schemaVersion: 2, exportedAt: now, documents, stats: null, thoughts: [] });
}

test.skip(({ browserName }) => browserName !== 'chromium', 'CPU throttling needs Chromium (CDP)');

test('a library of 50 books renders within the budget on a throttled phone', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: 'plyn-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backupWithBooks())
  });
  await expect(page.locator('[data-doc-id]')).toHaveCount(BOOKS, { timeout: 60_000 });

  // Time from the library screen appearing to all 50 cards being on it.
  await page.addInitScript((count) => {
    const w = window as unknown as { __shellAt?: number; __listAt?: number };
    const observer = new MutationObserver(() => {
      if (w.__shellAt === undefined && document.querySelector('main')) w.__shellAt = performance.now();
      if (document.querySelectorAll('[data-doc-id]').length >= count) {
        w.__listAt = performance.now();
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  }, BOOKS);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  await page.reload();
  await expect(page.getByRole('main', { name: uk.library.mainLabel })).toBeVisible();
  await expect(page.locator('[data-doc-id]')).toHaveCount(BOOKS);

  const { shellAt, listAt } = await page.evaluate(() => {
    const w = window as unknown as { __shellAt: number; __listAt: number };
    return { shellAt: w.__shellAt, listAt: w.__listAt };
  });
  const listMs = listAt - shellAt;
  test.info().annotations.push({
    type: 'perf',
    description: `list ${Math.round(listMs)} ms after the shell, ${Math.round(listAt)} ms after navigation (CPU ×${CPU_SLOWDOWN})`
  });
  console.log(`library: list ${Math.round(listMs)} ms after shell, ${Math.round(listAt)} ms total`);
  expect(listMs).toBeLessThan(BUDGET_MS);
});
