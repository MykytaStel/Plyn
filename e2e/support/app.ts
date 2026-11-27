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

/**
 * Reads documents straight from IndexedDB, the source of truth for progress.
 * Since 0.25 the text lives in its own `texts` table; it is joined back here.
 */
export async function storedDocs(page: Page): Promise<StoredDoc[]> {
  return page.evaluate(
    () =>
      new Promise<StoredDoc[]>((resolve, reject) => {
        const open = indexedDB.open('plyn_library_v2');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const hasTexts = db.objectStoreNames.contains('texts');
          const tx = db.transaction(hasTexts ? ['documents', 'texts'] : ['documents'], 'readonly');
          const docs = tx.objectStore('documents').getAll();
          const texts = hasTexts ? tx.objectStore('texts').getAll() : null;
          tx.oncomplete = () => {
            db.close();
            const byId = new Map(
              ((texts?.result ?? []) as Array<{ id: string; text: string }>).map((t) => [t.id, t.text])
            );
            resolve(
              (docs.result as StoredDoc[]).map((d) => ({ ...d, text: byId.get(d.id) ?? d.text }))
            );
          };
          tx.onerror = () => reject(tx.error);
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

export type SettingsSectionId = keyof typeof uk.settings.sections;

/** The Settings button of the library header. */
export async function openLibrarySettingsSheet(page: Page): Promise<void> {
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  await library.getByRole('button', { name: uk.reader.settings, exact: true }).click();
  await expect(page.getByRole('dialog', { name: uk.settings.title })).toBeVisible();
}

/**
 * From the first screen of Settings into one section (0.27). A row's accessible
 * name starts with the section title; the dialog is then named after it.
 * `dict` lets a test that runs in English pass `en`.
 */
export async function openSettingsSection(
  page: Page,
  section: SettingsSectionId,
  dict: typeof uk | typeof en = uk
): Promise<void> {
  const title = dict.settings.sections[section];
  await page
    .getByRole('dialog', { name: dict.settings.title })
    .getByRole('button', { name: new RegExp(`^${title}`) })
    .click();
  await expect(page.getByRole('dialog', { name: title })).toBeVisible();
}

/**
 * Saves a file the way this device does (`services/files/saveFile`): a download
 * on a desktop, the share sheet on a touch device that has one (stubbed, so the
 * test reads the file it was given). Returns the file's name and text.
 */
export async function savedFile(
  page: Page,
  save: () => Promise<void>
): Promise<{ name: string; text: string }> {
  const shares = await page.evaluate(
    () => matchMedia('(pointer: coarse)').matches && typeof navigator.share === 'function'
  );
  if (!shares) {
    const [download] = await Promise.all([page.waitForEvent('download'), save()]);
    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
    return { name: download.suggestedFilename(), text: Buffer.concat(chunks).toString('utf8') };
  }
  await page.evaluate(() => {
    const w = window as unknown as { __sharedFile?: Promise<{ name: string; text: string }> };
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: { files: File[] }) => {
        const file = data.files[0];
        w.__sharedFile = file.text().then((text) => ({ name: file.name, text }));
        return Promise.resolve();
      }
    });
  });
  await save();
  await page.waitForFunction(() => Boolean((window as unknown as { __sharedFile?: unknown }).__sharedFile));
  return page.evaluate(
    () => (window as unknown as { __sharedFile: Promise<{ name: string; text: string }> }).__sharedFile
  );
}
