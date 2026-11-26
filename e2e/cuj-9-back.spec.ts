import {
  expect,
  expectStoredOffset,
  nextCard,
  openReaderSettings,
  reader,
  startReading,
  test,
  uk,
  visibleCardOffset
} from './support/app';
import { numberedText } from './support/fixtures';

const TITLE = 'Кнопка назад';

/**
 * CUJ-9 (0.22): back — the Android gesture, the browser button, the iOS
 * swipe — closes the open sheet, then the reader, and never leaves Plyn
 * mid-text. Focus goes into a sheet and back to where it was.
 */
test('CUJ-9: back closes the sheet, then the reader; the library stays', async ({ page }) => {
  await page.goto('/');
  const appUrl = page.url();
  await startReading(page, TITLE, numberedText(40));
  await nextCard(page);
  await nextCard(page);
  const offset = await visibleCardOffset(page, TITLE);

  // A sheet opened from the keyboard: focus moves in, back closes it, focus returns.
  const feed = page.getByRole('region', { name: uk.reader.mainLabel }).locator('.cards-feed');
  await feed.focus();
  await page.keyboard.press('KeyN');
  const thoughts = page.getByRole('dialog', { name: uk.thoughts.title });
  await expect(thoughts).toBeVisible();
  await expect(thoughts.getByRole('textbox')).toBeFocused();

  await page.goBack();
  await expect(thoughts).toHaveCount(0);
  await expect(reader(page)).toBeVisible();
  await expect(feed).toBeFocused();

  // A sheet closed by the UI leaves no extra history entry behind.
  await openReaderSettings(page);
  const settings = page.getByRole('dialog', { name: uk.settings.title });
  await expect(settings.getByRole('button', { name: uk.settings.close })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(settings).toHaveCount(0);

  // So the next back returns to the library, at the same place.
  await page.goBack();
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  await expect(library).toBeVisible();
  expect(page.url()).toBe(appUrl);
  await expectStoredOffset(page, TITLE, offset);

  // Forward does not reopen anything by surprise, and the text opens where it was.
  await library.getByRole('button', { name: new RegExp(TITLE) }).first().click();
  await expect(reader(page)).toBeVisible();
  expect(await visibleCardOffset(page, TITLE)).toBe(offset);
});

test('CUJ-9: the "⋯" menu → bookmarks → back returns to the reader', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the "⋯" menu is the phone toolbar');
  await page.goto('/');
  await startReading(page, TITLE, numberedText(20));
  await page.keyboard.press('KeyB');

  const more = page.getByRole('button', { name: uk.reader.tools.more });
  await more.click();
  await page
    .getByRole('dialog', { name: uk.reader.tools.title })
    .getByRole('button', { name: new RegExp(uk.reader.tools.bookmarks) })
    .click();
  const bookmarks = page.getByRole('dialog', { name: uk.bookmarks.title });
  await expect(bookmarks).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(reader(page)).toBeVisible();
  // Focus returns past the closed menu, to the button that opened it.
  await expect(more).toBeFocused();

  await page.goBack();
  await expect(page.getByRole('main', { name: uk.library.mainLabel })).toBeVisible();
});

test('CUJ-9: back closes a library sheet and stays in the library', async ({ page }) => {
  await page.goto('/');
  const appUrl = page.url();
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  const open = library.getByRole('button', { name: uk.reader.settings, exact: true });
  await open.click();
  await expect(page.getByRole('dialog', { name: uk.settings.title })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(open).toBeFocused();
  expect(page.url()).toBe(appUrl);
});
