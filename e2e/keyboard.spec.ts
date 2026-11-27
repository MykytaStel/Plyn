import type { Page } from '@playwright/test';
import { expect, expectCard, reader, storedDocs, test, uk } from './support/app';
import { numberedText } from './support/fixtures';

/**
 * No mouse at all: reading, bookmarks, thoughts and settings with the keyboard
 * (TESTING.md § L8). Desktop projects only: the phone has no hardware keyboard.
 */
test.skip(({ isMobile }) => isMobile, 'keyboard journey runs on desktop projects');

/** Press Tab until the focused element has this accessible name; proves it is reachable. */
async function tabTo(page: Page, name: string | RegExp, maxPresses = 80): Promise<void> {
  const matches = (value: string) =>
    typeof name === 'string' ? value === name : name.test(value);
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return '';
      const labelledBy = el.getAttribute('aria-labelledby');
      const labelFor = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
      return (
        el.getAttribute('aria-label') ??
        (labelledBy ? document.getElementById(labelledBy)?.textContent : null) ??
        labelFor?.textContent ??
        el.textContent ??
        ''
      ).trim();
    });
    if (matches(focused)) return;
  }
  throw new Error(`"${String(name)}" is not reachable with Tab`);
}

/** A key press as it arrives from the Ukrainian layout: same physical key, Cyrillic `key`. */
async function pressInUkrainianLayout(page: Page, code: string, key: string): Promise<void> {
  await page.evaluate(
    ({ code, key }) => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true }));
    },
    { code, key }
  );
}

const TITLE = 'Клавіатура';

test('keyboard only: add a text, read, bookmark, park a thought, settings, back', async ({ page }) => {
  await page.goto('/');

  // Add a text.
  await tabTo(page, uk.library.titleLabel);
  await page.keyboard.type(TITLE);
  await tabTo(page, uk.library.textLabel);
  await page.keyboard.insertText(numberedText(60));
  await tabTo(page, uk.library.start);
  await page.keyboard.press('Enter');
  await expect(reader(page)).toBeVisible();
  await expect(page.locator('.cards-feed')).toBeFocused();

  // Read with every navigation key.
  await expectCard(page, 0);
  await page.keyboard.press('Space');
  await expectCard(page, 1);
  await page.keyboard.press('j');
  await expectCard(page, 2);
  await page.keyboard.press('ArrowRight');
  await expectCard(page, 3);
  await page.keyboard.press('ArrowDown');
  await expectCard(page, 4);
  await page.keyboard.press('k');
  await expectCard(page, 3);
  await page.keyboard.press('Shift+Space');
  await expectCard(page, 2);
  await page.keyboard.press('ArrowUp');
  await expectCard(page, 1);
  await page.keyboard.press('ArrowLeft');
  await expectCard(page, 0);
  await page.keyboard.press('ArrowDown');
  await expectCard(page, 1);

  // Bookmark (B) in the Latin layout, remove and add again in the Ukrainian one (И).
  const bookmark = page.getByRole('button', { name: uk.reader.bookmarkRemove });
  await page.keyboard.press('KeyB');
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await pressInUkrainianLayout(page, 'KeyB', 'и');
  await expect(page.getByRole('button', { name: uk.reader.bookmarkAdd })).toHaveAttribute('aria-pressed', 'false');
  await pressInUkrainianLayout(page, 'KeyB', 'и');
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await storedDocs(page))[0]?.bookmarkOffsets.length).toBe(1);

  // Anchor (A / Ф) and sentence focus (F / А).
  const feed = page.locator('.cards-feed');
  await page.keyboard.press('KeyA');
  await expect(feed).toHaveClass(/anchor-active/);
  await pressInUkrainianLayout(page, 'KeyA', 'ф');
  await expect(feed).not.toHaveClass(/anchor-active/);
  await pressInUkrainianLayout(page, 'KeyF', 'а');
  await expect(page.getByRole('status')).toHaveText(uk.reader.toasts.focusOn);
  await page.keyboard.press('KeyF');
  await expect(page.getByRole('status')).toHaveText(uk.reader.toasts.focusOff);

  // Park a thought (N / Т): focus lands in the field, Enter saves, Escape closes.
  await pressInUkrainianLayout(page, 'KeyN', 'т');
  const thoughts = page.getByRole('dialog', { name: uk.thoughts.title });
  await expect(thoughts.getByRole('textbox')).toBeFocused();
  await page.keyboard.type('Подзвонити мамі');
  await page.keyboard.press('Enter');
  await expect(thoughts.getByText('Подзвонити мамі')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(thoughts).toHaveCount(0);

  // Bookmarks list from the toolbar.
  await tabTo(page, `${uk.reader.bookmarksList}, 1`);
  await page.keyboard.press('Enter');
  const bookmarks = page.getByRole('dialog', { name: uk.bookmarks.title });
  await expect(bookmarks).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(bookmarks).toHaveCount(0);

  // Settings: open the Reading section, change card length, then close.
  await tabTo(page, uk.reader.settings);
  await page.keyboard.press('Enter');
  const settings = page.getByRole('dialog', { name: uk.settings.title });
  await expect(settings).toBeVisible();
  await tabTo(page, new RegExp(`^${uk.settings.sections.reading}`));
  await page.keyboard.press('Enter');
  // Inside a section the dialog is named after it.
  const section = page.getByRole('dialog', { name: uk.settings.sections.reading });
  await expect(section).toBeVisible();
  await tabTo(page, uk.settings.lengths.long);
  await page.keyboard.press('Enter');
  await expect(section.getByRole('radio', { name: uk.settings.lengths.long })).toHaveAttribute('aria-checked', 'true');
  // Escape steps back to the list of sections, a second one closes the sheet.
  await page.keyboard.press('Escape');
  await expect(settings).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Escape leaves the reader; the library card opens with Enter.
  await page.keyboard.press('Escape');
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  await expect(library).toBeVisible();
  await tabTo(page, new RegExp(`^${uk.libraryCard.open.replace('{title}', TITLE)}$`));
  await page.keyboard.press('Enter');
  await expect(reader(page)).toBeVisible();
  await expectCard(page, 1);
});

test('after the thoughts sheet closes, Space turns the page again', async ({ page }) => {
  await page.goto('/');
  await tabTo(page, uk.library.textLabel);
  await page.keyboard.insertText(numberedText(60));
  await tabTo(page, uk.library.start);
  await page.keyboard.press('Enter');
  await expect(reader(page)).toBeVisible();
  await expectCard(page, 0);

  await page.getByRole('button', { name: uk.reader.parkThought }).click();
  const thoughts = page.getByRole('dialog', { name: uk.thoughts.title });
  await expect(thoughts).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.keyboard.press('Space');
  await expectCard(page, 1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
