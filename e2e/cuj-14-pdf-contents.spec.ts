import type { Page } from '@playwright/test';
import { expect, reader, storedDocs, test, uk, visibleCardText } from './support/app';
import {
  OUTLINED_PDF_CHAPTERS,
  OUTLINED_PDF_IMPRINT,
  outlinedPdfFixture
} from './support/fixtures';

/** Contents sit in the header on wide screens and under "⋯" on phones. */
async function openContents(page: Page): Promise<void> {
  const direct = page.getByRole('button', { name: uk.reader.contentsList, exact: true });
  if (await direct.isVisible()) {
    await direct.click();
  } else {
    await page.getByRole('button', { name: uk.reader.tools.more }).click();
    await page.getByRole('button', { name: uk.reader.tools.contents }).click();
  }
  await expect(page.getByRole('dialog', { name: uk.bookmarks.titleWithContents })).toBeVisible();
}

test('CUJ-14: a PDF with its own contents opens at chapter one; the imprint stays reachable', async ({
  page
}) => {
  await page.goto('/');
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles(outlinedPdfFixture());
  await expect(page.getByLabel(uk.library.textLabel)).toHaveValue(/Chapter Two/);
  await page.getByRole('button', { name: uk.library.start }).click();
  await expect(reader(page)).toBeVisible();

  // The outline became the book's contents, with offsets into its text.
  const [doc] = await storedDocs(page);
  expect(doc.chapters?.map((c) => c.title)).toEqual(OUTLINED_PDF_CHAPTERS);
  const firstChapter = doc.chapters![0].offset;
  expect(doc.text.slice(firstChapter)).toMatch(/^Chapter One/);

  // Reading starts at chapter one, not at the imprint…
  await expect.poll(() => visibleCardText(page)).toBe('Chapter One');
  await expect.poll(async () => (await storedDocs(page))[0].charOffset).toBe(firstChapter);

  // …which is still there, one card back.
  await page.locator('.cards-feed').focus();
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => visibleCardText(page)).toBe(OUTLINED_PDF_IMPRINT);

  // The contents sheet jumps to chapter two.
  await openContents(page);
  await page
    .getByRole('list', { name: uk.bookmarks.contents })
    .getByRole('button', { name: /Chapter Two/ })
    .click();
  await expect.poll(() => visibleCardText(page)).toBe('Chapter Two');
});
