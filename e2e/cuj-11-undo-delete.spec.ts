import {
  expect,
  expectStoredOffset,
  nextCard,
  startReading,
  storedDocs,
  test,
  uk,
  visibleCardOffset
} from './support/app';
import { numberedText } from './support/fixtures';

const TITLE = 'Не той текст';

test('CUJ-11: delete → Undo → the same text at the same place', async ({ page }) => {
  await page.goto('/');
  await startReading(page, TITLE, numberedText(40));
  await nextCard(page);
  await nextCard(page);
  await page.keyboard.press('KeyB');
  const offset = await visibleCardOffset(page, TITLE);
  await expectStoredOffset(page, TITLE, offset);
  await expect.poll(async () => (await storedDocs(page))[0]?.bookmarkOffsets).toEqual([offset]);

  await page.getByRole('button', { name: uk.reader.library, exact: true }).click();
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  await expect(library).toBeVisible();
  const before = (await storedDocs(page))[0];
  expect(before.charOffset).toBe(offset);
  await library.getByRole('button', { name: uk.libraryCard.delete.replace('{title}', TITLE) }).click();

  // Gone from the library at once, with Undo focused.
  await expect.poll(async () => (await storedDocs(page)).length).toBe(0);
  const undo = page.getByRole('button', { name: uk.library.feedback.undo });
  await expect(undo).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(undo).toBeHidden();
  await expect(library.getByRole('button', { name: uk.libraryCard.open.replace('{title}', TITLE) })).toBeFocused();
  expect(await storedDocs(page)).toEqual([before]);
});

test('CUJ-11: without Undo the deletion stays', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await startReading(page, TITLE, numberedText(10));
  await page.getByRole('button', { name: uk.reader.library, exact: true }).click();
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  await library.getByRole('button', { name: uk.libraryCard.delete.replace('{title}', TITLE) }).click();

  const undo = page.getByRole('button', { name: uk.library.feedback.undo });
  await expect(undo).toBeVisible();
  await page.clock.runFor(6500);
  await expect(undo).toBeHidden();
  await page.reload();
  await expect(page.getByRole('main', { name: uk.library.mainLabel })).toBeVisible();
  expect(await storedDocs(page)).toHaveLength(0);
});
