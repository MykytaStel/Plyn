import { titleFromFileName } from '../src/core/parsers/fileName';
import { expect, reader, test, uk } from './support/app';
import {
  EPUB_FIRST_LINE,
  EPUB_TITLE,
  epubFixture,
  PDF_TEXT,
  PDF_FILE_NAME,
  pdfFixture
} from './support/fixtures';

const cases = [
  { kind: 'epub', file: epubFixture, title: EPUB_TITLE, firstCard: EPUB_FIRST_LINE },
  { kind: 'pdf', file: pdfFixture, title: titleFromFileName(PDF_FILE_NAME), firstCard: PDF_TEXT }
];

for (const c of cases) {
  test(`CUJ-4: import .${c.kind} → right title, right first card`, async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"][accept*=".epub"]').setInputFiles(c.file());

    await expect(page.getByLabel(uk.library.titleLabel)).toHaveValue(c.title);
    await expect(page.getByLabel(uk.library.textLabel)).toHaveValue(new RegExp(c.firstCard.slice(0, 20)));
    await page.getByRole('button', { name: uk.library.start }).click();

    await expect(reader(page)).toBeVisible();
    await expect(page.locator('.card-slide[data-index="0"] .card-text')).toContainText(c.firstCard);
  });
}
