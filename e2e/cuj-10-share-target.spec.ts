import { expect, reader, test, uk } from './support/app';

/**
 * CUJ-10 (0.22): the Web Share Target. Android opens `/?title=…&text=…`
 * (manifest `share_target`); the shared text lands in the import box and the
 * query string is cleaned so a reload does not import it twice.
 */
test('CUJ-10: shared text lands in the import box', async ({ page }) => {
  const text = 'Поділений текст. Він короткий, але цілком справжній.';
  await page.goto(`/?title=${encodeURIComponent('Поділене')}&text=${encodeURIComponent(text)}`);

  await expect(page.getByLabel(uk.library.titleLabel)).toHaveValue('Поділене');
  await expect(page.getByLabel(uk.library.textLabel)).toHaveValue(text);
  await expect(page.getByText(uk.library.feedback.sharedText)).toBeVisible();
  expect(new URL(page.url()).search).toBe('');

  await page.getByRole('button', { name: uk.library.start }).click();
  await expect(reader(page)).toBeVisible();
});

test('CUJ-10: a shared link is imported through /api/extract', async ({ page }) => {
  await page.route('**/api/extract', (route) =>
    route.fulfill({
      json: { title: 'Стаття', text: 'Перший абзац статті.\n\nДругий абзац статті.' }
    })
  );
  await page.goto(`/?text=${encodeURIComponent('Глянь https://example.org/article')}`);

  await expect(page.getByLabel(uk.library.titleLabel)).toHaveValue('Стаття');
  await expect(page.getByLabel(uk.library.textLabel)).toHaveValue(/Перший абзац статті/);
});
