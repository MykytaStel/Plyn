import { test as base, expect, type Page } from '@playwright/test';
import { en } from '../../src/i18n/locales/en';
import { uk } from '../../src/i18n/locales/uk';

export { en, uk, expect };

export interface StoredDoc {
  id: string;
  title: string;
  text: string;
  charOffset: number;
  bookmarkOffsets: number[];
  author?: string;
  chapters?: Array<{ title: string; offset: number; level: number }>;
}

interface Options {
  /** Show the first-run onboarding (only CUJ-1 wants it). */
  onboarding: boolean;
  /** Partial `plyn_settings_v1` written before the app starts. */
  settings: Record<string, unknown> | null;
}

/**
 * Every test gets a fresh browser context (clean IndexedDB and localStorage).
 * Nothing leaves localhost: any other host is aborted, and `/api/extract`
 * must be mocked by the test that needs it (TESTING.md rule 2).
 */
export const test = base.extend<Options>({
  onboarding: [false, { option: true }],
  settings: [null, { option: true }],
  page: async ({ page, onboarding, settings }, provide) => {
    await page.context().route(
      (url) => url.hostname !== 'localhost' && url.protocol !== 'data:' && url.protocol !== 'blob:',
      (route) => route.abort()
    );
    await page.route('**/api/extract', (route) =>
      route.fulfill({ status: 500, json: { code: 'network_error' } })
    );
    await page.addInitScript(
      ({ skipOnboarding, settingsJson }) => {
        // Only on the very first load of this context, so reloads keep what the test did.
        if (sessionStorage.getItem('e2e_seeded')) return;
        sessionStorage.setItem('e2e_seeded', '1');
        if (skipOnboarding) localStorage.setItem('plyn_onboarding_done_v1', '1');
        if (settingsJson) localStorage.setItem('plyn_settings_v1', settingsJson);
      },
      { skipOnboarding: !onboarding, settingsJson: settings ? JSON.stringify(settings) : null }
    );
    await provide(page);
  }
});

/** Paste a text into the library editor and start reading. */
export async function startReading(page: Page, title: string, text: string): Promise<void> {
  const editorToggle = page.getByRole('button', { name: uk.library.expandEditor });
  if (await editorToggle.isVisible()) await editorToggle.click();
  await page.getByLabel(uk.library.titleLabel).fill(title);
  await page.getByLabel(uk.library.textLabel).fill(text);
  await page.getByRole('button', { name: uk.library.start }).click();
  await expect(reader(page)).toBeVisible();
}

export function reader(page: Page) {
  return page.getByRole('region', { name: uk.reader.mainLabel });
}

/** The "3 / 12" counter in the reader header. */
export async function counter(page: Page): Promise<{ index: number; total: number }> {
  const button = page.locator('.counter-btn');
  await expect(button).toHaveText(/\d+ \/ \d+/);
  const [current, total] = ((await button.textContent()) ?? '').match(/\d+/g)!.map(Number);
  return { index: current - 1, total };
}

export async function expectCard(page: Page, index: number): Promise<void> {
  await expect(page.locator('.counter-btn')).toHaveText(new RegExp(`^${index + 1} / \\d+`));
}

/** Text of the card that is on screen now. */
export async function visibleCardText(page: Page): Promise<string> {
  const { index } = await counter(page);
  return (await page.locator(`.card-slide[data-index="${index}"] .card-text`).innerText()).trim();
}

/** Next card with the keyboard (works on every project, also the phone). */
export async function nextCard(page: Page, key = 'ArrowDown'): Promise<void> {
  const { index } = await counter(page);
  await page.keyboard.press(key);
  await expectCard(page, index + 1);
}

/** Reads documents straight from IndexedDB, the source of truth for progress. */
export async function storedDocs(page: Page): Promise<StoredDoc[]> {
  return page.evaluate(
    () =>
      new Promise<StoredDoc[]>((resolve, reject) => {
        const open = indexedDB.open('plyn_library_v2');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('documents', 'readonly');
          const all = tx.objectStore('documents').getAll();
          all.onsuccess = () => {
            open.result.close();
            resolve(all.result as StoredDoc[]);
          };
          all.onerror = () => reject(all.error);
        };
      })
  );
}

/** Waits until the debounced progress write has reached IndexedDB. */
export async function expectStoredOffset(page: Page, title: string, offset: number): Promise<void> {
  await expect
    .poll(async () => (await storedDocs(page)).find((d) => d.title === title)?.charOffset)
    .toBe(offset);
}

/** The `startOffset` of the card on screen, as the splitter computed it. */
export async function visibleCardOffset(page: Page, title: string): Promise<number> {
  const text = await visibleCardText(page);
  const doc = (await storedDocs(page)).find((d) => d.title === title)!;
  // Card text is an exact slice of the normalized document text (invariant 1).
  const start = doc.text.indexOf(text);
  expect(start, 'card text is a slice of the stored text').toBeGreaterThanOrEqual(0);
  return start;
}

/** Reader settings: a header button on desktop, behind "⋯" on the phone toolbar. */
export async function openReaderSettings(page: Page): Promise<void> {
  const direct = page.getByRole('button', { name: uk.reader.settings, exact: true });
  if (await direct.isVisible()) {
    await direct.click();
  } else {
    await page.getByRole('button', { name: uk.reader.tools.more }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: uk.reader.tools.settings, exact: true })
      .click();
  }
  await expect(page.getByRole('dialog', { name: uk.settings.title })).toBeVisible();
}
