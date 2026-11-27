import {
  expect,
  openLibrarySettingsSheet,
  openReaderSettings,
  openSettingsSection,
  reader,
  startReading,
  test,
  uk,
  type SettingsSectionId
} from './support/app';
import { numberedText } from './support/fixtures';

const SECTIONS = Object.keys(uk.settings.sections) as SettingsSectionId[];

/**
 * CUJ-16 (0.27): Settings is a short first screen; each of five rows opens a
 * section in the same sheet. Back (the gesture, simulated by goBack) steps out
 * of a section first, then closes the sheet.
 */
test('CUJ-16: five sections from the library; theme changes; back steps out, then closes', async ({
  page
}) => {
  await page.goto('/');
  const appUrl = page.url();
  await openLibrarySettingsSheet(page);
  const sheet = page.getByRole('dialog', { name: uk.settings.title });

  for (const section of SECTIONS) {
    await openSettingsSection(page, section);
    const dialog = page.getByRole('dialog', { name: uk.settings.sections[section] });
    await expect(dialog.getByRole('heading', { level: 2, name: uk.settings.sections[section] })).toBeVisible();
    await dialog.getByRole('button', { name: uk.settings.back }).click();
    await expect(sheet).toBeVisible();
  }

  // Appearance: the theme changes the page.
  await openSettingsSection(page, 'appearance');
  await page
    .getByRole('radiogroup', { name: uk.settings.themeChoice })
    .getByRole('radio', { name: uk.settings.themes.paper })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');

  // Back inside a section: the first screen, not the library.
  await page.goBack();
  await expect(sheet).toBeVisible();
  await expect(page.getByRole('button', { name: uk.settings.back })).toHaveCount(0);

  // Back again closes the sheet; the library is still there, same URL.
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('main', { name: uk.library.mainLabel })).toBeVisible();
  expect(page.url()).toBe(appUrl);
});

test('CUJ-16: from the reader, back twice leaves the reader open', async ({ page }) => {
  await page.goto('/');
  await startReading(page, 'Налаштування в читанні', numberedText(30));
  await openReaderSettings(page);
  const sheet = page.getByRole('dialog', { name: uk.settings.title });
  await openSettingsSection(page, 'sound');

  await page.goBack();
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(reader(page)).toBeVisible();
});
