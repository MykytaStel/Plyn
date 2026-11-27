import {
  expect,
  nextCard,
  savedFile,
  startReading,
  test,
  uk,
  visibleCardText
} from './support/app';
import { numberedText } from './support/fixtures';

const TITLE = 'Нотатки до закладок';
const NOTE = 'перечитати перед зустріччю';

test('CUJ-8: bookmark with a note → export Markdown → the file has the card and the note', async ({
  page
}) => {
  await page.goto('/');
  await startReading(page, TITLE, numberedText(30));
  await nextCard(page);
  await nextCard(page);
  const cardText = await visibleCardText(page);
  await page.keyboard.press('KeyB');
  await expect(page.getByRole('button', { name: uk.reader.bookmarkRemove })).toBeVisible();

  const more = page.getByRole('button', { name: uk.reader.tools.more });
  if (await more.isVisible()) {
    await more.click();
    await page
      .getByRole('dialog', { name: uk.reader.tools.title })
      .getByRole('button', { name: new RegExp(uk.reader.tools.bookmarks) })
      .click();
  } else {
    await page.getByRole('button', { name: new RegExp(uk.reader.bookmarksList) }).click();
  }
  const sheet = page.getByRole('dialog', { name: uk.bookmarks.title });
  await expect(sheet).toBeVisible();

  const note = sheet.getByPlaceholder(uk.bookmarks.notePlaceholder);
  await note.fill(NOTE);
  await note.press('Enter');

  const file = await savedFile(page, () => sheet.getByRole('button', { name: '.md' }).click());
  expect(file.name).toMatch(/-bookmarks\.md$/);
  const md = file.text;

  expect(md).toContain(TITLE);
  expect(md).toContain(cardText.split('\n')[0]);
  expect(md).toContain(NOTE);
});
