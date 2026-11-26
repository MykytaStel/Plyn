import type { Page } from '@playwright/test';
import { expect, reader, storedDocs, test, uk } from './support/app';
import { specBook } from './support/fixtures';

/**
 * CUJ-12 (0.23): open a book with a table of contents and jump to a chapter.
 * The contents sheet closes on back like every other sheet (CUJ-9).
 */

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

test('CUJ-12: EPUB contents → jump to a chapter; back closes the sheet, then the reader', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('input[type="file"][accept*=".epub"]')
    .setInputFiles(specBook('books/epub3-nav-fragments.epub'));
  await expect(page.getByLabel(uk.library.titleLabel)).toHaveValue('Тиха книга');
  await page.getByRole('button', { name: uk.library.start }).click();
  await expect(reader(page)).toBeVisible();

  // Author and contents are stored with the book, offsets into its text.
  const [doc] = await storedDocs(page);
  expect(doc.author).toBe('Марта Вигадана, Остап Уявний');
  expect(doc.chapters?.map((c) => c.title)).toEqual([
    'Частина перша',
    'Розділ 1',
    'Розділ 2',
    'Частина друга'
  ]);

  await openContents(page);
  const contents = page.getByRole('list', { name: uk.bookmarks.contents });
  await expect(contents.getByRole('button', { name: /Частина перша/ })).toHaveAttribute(
    'aria-current',
    'location'
  );
  await contents.getByRole('button', { name: /Частина друга/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const chapterStart = doc.chapters!.find((c) => c.title === 'Частина друга')!.offset;
  await expect
    .poll(async () => (await storedDocs(page))[0].charOffset)
    .toBeGreaterThanOrEqual(chapterStart);

  // Back #1: closes the sheet, the reader stays.
  await openContents(page);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(reader(page)).toBeVisible();

  // Back #2: returns to the library, still inside Plyn.
  await page.goBack();
  await expect(page.getByRole('main', { name: uk.library.mainLabel })).toBeVisible();
  expect(new URL(page.url()).hostname).toBe('localhost');
});
