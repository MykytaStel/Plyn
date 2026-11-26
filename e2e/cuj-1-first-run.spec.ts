import { en, expect, reader, test, uk } from './support/app';

test.use({ onboarding: true });

test('CUJ-1: onboarding → sample → first card; UI to English and back', async ({ page }) => {
  await page.goto('/');

  const onboarding = page.getByRole('dialog');
  await expect(onboarding.getByRole('heading', { name: uk.onboarding.step1.title })).toBeVisible();
  await onboarding.getByRole('button', { name: uk.onboarding.next }).click();
  await expect(onboarding.getByRole('heading', { name: uk.onboarding.step2.title })).toBeVisible();
  await onboarding.getByRole('button', { name: uk.onboarding.next }).click();
  await onboarding.getByRole('button', { name: uk.onboarding.trySample }).click();

  await expect(reader(page)).toBeVisible();
  await expect(page.locator('.counter-btn')).toHaveText(/^1 \/ \d+/);
  const firstWords = uk.sample.text.split(/\s+/).slice(0, 5).join(' ');
  await expect(page.locator('.card-slide[data-index="0"] .card-text')).toContainText(firstWords);
  await expect(page.locator('.card-slide[data-index="0"]')).toHaveAttribute('lang', 'uk');

  // Back to the library: onboarding does not come back.
  await page.getByRole('button', { name: uk.reader.library, exact: true }).click();
  await expect(page.getByRole('main', { name: uk.library.mainLabel })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Switch the interface to English.
  await page.getByRole('button', { name: uk.reader.settings, exact: true }).click();
  const settings = page.getByRole('dialog', { name: uk.settings.title });
  await settings.getByRole('radio', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('dialog', { name: en.settings.title })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: en.library.libraryTitle })).toBeVisible();
  await expect(page).toHaveTitle(en.meta.title);

  // The choice survives a reload, and the library text keeps its own language.
  await page.reload();
  await expect(page.getByRole('heading', { name: en.library.libraryTitle })).toBeVisible();
  await expect(page.getByText(uk.sample.title).first()).toBeVisible();

  // And back to Ukrainian.
  await page.getByRole('button', { name: en.reader.settings, exact: true }).click();
  await page.getByRole('dialog', { name: en.settings.title }).getByRole('radio', { name: 'Українська' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
  await expect(page.getByRole('dialog', { name: uk.settings.title })).toBeVisible();
});
