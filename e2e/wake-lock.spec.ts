import { expect, openReaderSettings, openSettingsSection, reader, startReading, test, uk } from './support/app';
import { numberedText } from './support/fixtures';

/**
 * 0.22: the screen stays on while reading (Screen Wake Lock), and the
 * Settings switch turns it off. The API is replaced with a recorder, so
 * the test does not depend on the engine's support or on battery state.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const log: string[] = [];
    (window as unknown as { wakeLog: string[] }).wakeLog = log;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          log.push('request');
          const listeners: Array<() => void> = [];
          return {
            release: async () => {
              log.push('release');
              listeners.forEach((l) => l());
            },
            addEventListener: (_t: string, l: () => void) => listeners.push(l)
          };
        }
      }
    });
  });
});

const wakeLog = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { wakeLog: string[] }).wakeLog.join(','));

test('the screen stays on in the reader, not in the library', async ({ page }) => {
  await page.goto('/');
  expect(await wakeLog(page)).toBe('');
  await startReading(page, 'Екран', numberedText(20));
  await expect.poll(() => wakeLog(page)).toBe('request');

  await page.getByRole('button', { name: uk.reader.library, exact: true }).click();
  await expect(page.getByRole('main', { name: uk.library.mainLabel })).toBeVisible();
  await expect.poll(() => wakeLog(page)).toBe('request,release');
});

test('the Settings switch lets the screen sleep', async ({ page }) => {
  await page.goto('/');
  await startReading(page, 'Екран', numberedText(20));
  await expect.poll(() => wakeLog(page)).toBe('request');

  await openReaderSettings(page);
  await openSettingsSection(page, 'reading');
  const toggle = page.getByRole('checkbox', { name: uk.settings.keepScreenOn });
  await expect(toggle).toBeChecked();
  await page.locator('label[for="toggle-keep-screen-on"]').click();
  await expect(toggle).not.toBeChecked();
  await expect.poll(() => wakeLog(page)).toBe('request,release');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(reader(page)).toBeVisible();
});
