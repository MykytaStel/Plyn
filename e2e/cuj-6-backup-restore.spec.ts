import type { Page } from '@playwright/test';
import {
  expect,
  expectStoredOffset,
  nextCard,
  startReading,
  storedDocs,
  test,
  uk,
  visibleCardOffset
} from './support/app';
import { numberedText } from './support/fixtures';

const TITLE = 'Бекап і назад';

test.use({ settings: { theme: 'mint', fontSize: 28 } });

/** Adds a Thought Parking note straight to IndexedDB (the sheet has its own tests). */
async function seedThought(page: Page, text: string): Promise<void> {
  await page.evaluate(
    (noteText) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('plyn_library_v2');
        open.onsuccess = () => {
          const tx = open.result.transaction('thoughts', 'readwrite');
          tx.objectStore('thoughts').put({ id: 'e2e-thought', text: noteText, createdAt: Date.now() });
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    text
  );
}

async function thoughtTexts(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open('plyn_library_v2');
        open.onsuccess = () => {
          const all = open.result.transaction('thoughts').objectStore('thoughts').getAll();
          all.onsuccess = () => {
            open.result.close();
            resolve((all.result as { text: string }[]).map((n) => n.text));
          };
        };
      })
  );
}

/**
 * Saves a backup the way this device does: a download on a desktop, the share
 * sheet on a phone (stubbed, so the test sees the file it was given).
 */
async function saveBackup(page: Page): Promise<string> {
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  const backupButton = library.getByRole('button', { name: uk.library.backup, exact: true });
  const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  if (!touch) {
    const [download] = await Promise.all([page.waitForEvent('download'), backupButton.click()]);
    expect(download.suggestedFilename()).toMatch(/^plyn-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8');
  }
  await page.evaluate(() => {
    const w = window as unknown as { __sharedBackup?: Promise<string> };
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: { files: File[] }) => {
        w.__sharedBackup = data.files[0].text();
        return Promise.resolve();
      }
    });
  });
  await backupButton.click();
  await expect(page.getByRole('status').filter({ hasText: uk.library.feedback.backupSaved })).toBeVisible();
  return page.evaluate(() => (window as unknown as { __sharedBackup: Promise<string> }).__sharedBackup);
}

/** Wipes IndexedDB and localStorage from a page where the app is not running. */
async function wipeDevice(page: Page): Promise<void> {
  await page.goto('/icons/icon.svg');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        localStorage.clear();
        localStorage.setItem('plyn_onboarding_done_v1', '1');
        const req = indexedDB.deleteDatabase('plyn_library_v2');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('database still open'));
      })
  );
}

test('CUJ-6: backup → wipe → restore brings back texts, place, bookmarks, thoughts and settings', async ({
  page
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mint');
  await startReading(page, TITLE, numberedText(60));
  await nextCard(page);
  await nextCard(page);
  await page.keyboard.press('KeyB');
  const offset = await visibleCardOffset(page, TITLE);
  await expectStoredOffset(page, TITLE, offset);
  await expect.poll(async () => (await storedDocs(page))[0]?.bookmarkOffsets).toEqual([offset]);
  await seedThought(page, 'Подзвонити мамі');

  await page.getByRole('button', { name: uk.reader.library, exact: true }).click();
  const json = JSON.parse(await saveBackup(page));
  expect(json.schemaVersion).toBe(2);
  expect(json.thoughts).toHaveLength(1);
  expect(json.settings.theme).toBe('mint');

  await wipeDevice(page);
  await page.goto('/');
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  await expect(library).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await storedDocs(page)).toHaveLength(0);

  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: 'plyn-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(json))
  });

  await expect(page.getByRole('status').filter({ hasText: '1 думку' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mint');
  const [doc] = await storedDocs(page);
  expect(doc.title).toBe(TITLE);
  expect(doc.charOffset).toBe(offset);
  expect(doc.bookmarkOffsets).toEqual([offset]);
  expect(await thoughtTexts(page)).toEqual(['Подзвонити мамі']);
});
