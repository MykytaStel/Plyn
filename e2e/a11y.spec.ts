import {
  en,
  expect,
  nextCard,
  openReaderSettings,
  reader,
  startReading,
  test,
  uk
} from './support/app';
import { expectNoSeriousA11yIssues } from './support/axe';
import { numberedText } from './support/fixtures';

const THEMES = ['dark', 'paper', 'gray', 'mint'] as const;

// Same DOM in every engine; Chromium desktop and the phone layout are enough.
test.skip(({ browserName }) => browserName !== 'chromium', 'axe runs on Chromium projects');

for (const theme of THEMES) {
  test.describe(`theme ${theme}`, () => {
    test.use({ settings: { theme } });

    test('onboarding', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: uk.library.helpLabel }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      for (let step = 1; step <= 3; step += 1) {
        await expectNoSeriousA11yIssues(page, `onboarding step ${step} (${theme})`);
        if (step < 3) await page.getByRole('button', { name: uk.onboarding.next }).click();
      }
    });

    test('library and its sheets', async ({ page }) => {
      await page.goto('/');
      await expectNoSeriousA11yIssues(page, `empty library (${theme})`);

      await startReading(page, 'Доступність', numberedText(30));
      await page.keyboard.press('KeyN');
      const thoughts = page.getByRole('dialog', { name: uk.thoughts.title });
      await thoughts.getByRole('textbox').fill('Купити хліб');
      await thoughts.getByRole('textbox').press('Enter');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: uk.reader.library, exact: true }).click();

      const library = page.getByRole('main', { name: uk.library.mainLabel });
      await expect(library).toBeVisible();
      await expectNoSeriousA11yIssues(page, `library with a text (${theme})`);

      const sheets = [
        { open: uk.reader.settings, exact: true, title: uk.settings.title },
        { open: uk.achievementsSheet.title, exact: false, title: uk.achievementsSheet.title },
        { open: uk.library.thoughtsLabel, exact: false, title: uk.thoughts.title }
      ];
      for (const sheet of sheets) {
        await library.getByRole('button', { name: sheet.open, exact: sheet.exact }).click();
        await expect(page.getByRole('dialog', { name: sheet.title })).toBeVisible();
        await expectNoSeriousA11yIssues(page, `library sheet "${sheet.title}" (${theme})`);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
      }
    });

    test('reader and its sheets', async ({ page }) => {
      await page.goto('/');
      await startReading(page, 'Доступність', numberedText(30));
      await nextCard(page);
      await page.keyboard.press('KeyB');
      await expect(page.getByRole('button', { name: uk.reader.bookmarkRemove })).toBeVisible();
      await expectNoSeriousA11yIssues(page, `reader card (${theme})`);

      await openReaderSettings(page);
      await expectNoSeriousA11yIssues(page, `reader settings (${theme})`);
      await page.keyboard.press('Escape');

      await page.keyboard.press('KeyN');
      await expect(page.getByRole('dialog', { name: uk.thoughts.title })).toBeVisible();
      await expectNoSeriousA11yIssues(page, `thought parking (${theme})`);
      await page.keyboard.press('Escape');

      const more = page.getByRole('button', { name: uk.reader.tools.more });
      if (await more.isVisible()) {
        await more.click();
        await expect(page.getByRole('dialog', { name: uk.reader.tools.title })).toBeVisible();
        await expectNoSeriousA11yIssues(page, `reader tools (${theme})`);
        await page
          .getByRole('dialog', { name: uk.reader.tools.title })
          .getByRole('button', { name: new RegExp(uk.reader.tools.bookmarks) })
          .click();
      } else {
        await page.getByRole('button', { name: uk.reader.bookmarksList }).click();
      }
      await expect(page.getByRole('dialog', { name: uk.bookmarks.title })).toBeVisible();
      await expectNoSeriousA11yIssues(page, `bookmarks (${theme})`);
      await page.keyboard.press('Escape');

      await page.keyboard.press('KeyZ');
      await expectNoSeriousA11yIssues(page, `zen mode (${theme})`);
      await expect(reader(page)).toBeVisible();
    });
  });
}

test.describe('English interface', () => {
  test.use({ settings: { language: 'en' } });

  test('onboarding, library and settings', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expectNoSeriousA11yIssues(page, 'empty library (en)');

    await page.getByRole('button', { name: en.reader.settings, exact: true }).click();
    await expect(page.getByRole('dialog', { name: en.settings.title })).toBeVisible();
    await expectNoSeriousA11yIssues(page, 'settings (en)');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: en.library.helpLabel }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoSeriousA11yIssues(page, 'onboarding (en)');
  });
});
