import {
  expect,
  openLibrarySettingsSheet,
  openSettingsSection,
  reader,
  startReading,
  test,
  uk
} from './support/app';
import { installStubSpeech } from './support/speech';

/**
 * L6 visual regression (docs/TESTING.md): the baseline that guards CSS
 * refactors (IMP-09) and dependency upgrades (lucide icons, Vite).
 *
 * Chromium only (desktop and the Pixel 7 layout): pixels differ between
 * engines and the baseline must be stable. Snapshots live next to this file;
 * update them on purpose with `npm run test:visual:update` and review the diff.
 */
test.skip(({ browserName }) => browserName !== 'chromium', 'visual baseline is Chromium only');

const THEMES = ['dark', 'paper', 'gray', 'mint'] as const;
const FONTS = ['sans', 'hyperlegible', 'dyslexic', 'serif'] as const;

/** Both scripts on one card, so every font stack shows its Latin and Cyrillic faces. */
const MIXED_TEXT = [
  'Плин розбиває довгий текст на короткі картки. Їх читають одну за одною, спокійно і без поспіху: ґанок, їжак, єнот.',
  'A calm reader for long texts. One short card at a time, with room to breathe between them.',
  'Третій абзац потрібен, щоб текст мав продовження і лічильник показував кілька карток.'
].join('\n\n');

async function settle(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  // The first-card hint and toasts fade; wait until nothing is moving.
  await page.waitForTimeout(150);
}

for (const theme of THEMES) {
  test.describe(`theme ${theme}`, () => {
    for (const fontFamily of FONTS) {
      test.describe(`font ${fontFamily}`, () => {
        test.use({ settings: { theme, fontFamily } });

        test('reader card', async ({ page }) => {
          await page.goto('/');
          await startReading(page, 'Візуальна перевірка', MIXED_TEXT);
          await settle(page);
          await expect(reader(page)).toHaveScreenshot(`reader-${theme}-${fontFamily}.png`);
        });
      });
    }

    test.describe('screens', () => {
      test.use({ settings: { theme } });

      test('empty library', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('main', { name: uk.library.mainLabel })).toBeVisible();
        await settle(page);
        await expect(page).toHaveScreenshot(`library-empty-${theme}.png`);
      });

      test.describe('spoken word', () => {
        test.use({ settings: { theme, ttsWordHighlight: true } });
        test('reader card, spoken word', async ({ page }) => {
          // 0.26: the highlight colour per theme, frozen on the third word.
          await installStubSpeech(page, { wordMs: 20, pauseAfterWords: 3 });
          await page.goto('/');
          await startReading(page, 'Візуальна перевірка', MIXED_TEXT);
          await page.keyboard.press('s');
          await expect
            .poll(() => page.evaluate(() => (window as unknown as { __speechPause: boolean }).__speechPause))
            .toBe(true);
          await expect(page.locator('.is-spoken')).toHaveCount(1);
          await settle(page);
          await expect(reader(page)).toHaveScreenshot(`reader-spoken-${theme}.png`);
        });
      });

      // 0.27: Settings is a first screen of rows; Sound is the longest section.
      // Opened from the library, which every project reaches the same way.
      test('settings first screen', async ({ page }) => {
        await page.goto('/');
        await openLibrarySettingsSheet(page);
        await settle(page);
        await expect(page.getByRole('dialog', { name: uk.settings.title })).toHaveScreenshot(
          `settings-first-${theme}.png`,
          // The storage summary depends on how much this browser has cached.
          { mask: [page.locator('.settings-row:last-child .settings-row-summary')] }
        );
      });

      test('settings sound section', async ({ page }) => {
        await page.goto('/');
        await openLibrarySettingsSheet(page);
        await openSettingsSection(page, 'sound');
        await settle(page);
        await expect(page.getByRole('dialog', { name: uk.settings.sections.sound })).toHaveScreenshot(
          `settings-sound-${theme}.png`
        );
      });
    });
  });
}
