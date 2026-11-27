import type { Page } from '@playwright/test';
import {
  counter,
  expect,
  nextCard,
  reader,
  startReading,
  storedDocs,
  test,
  uk,
  visibleCardOffset
} from './support/app';
import { numberedText, specBook } from './support/fixtures';
import { installStubSpeech, speechLog } from './support/speech';

/**
 * CUJ-15 (0.26): listening follows the spoken word, moves from card to card
 * without waiting for the scroll, and stops where a new chapter begins.
 * A stub voice stands in for the engine (no real audio in CI).
 */

/** Speak calls so far: the stub voice logs every utterance the app sends. */
const speakCount = async (page: Page) =>
  (await speechLog(page)).filter((e) => e.event === 'speak').length;

/** Listening has stopped: the highlight is gone and no new card gets spoken. */
async function expectSilent(page: Page): Promise<void> {
  await expect(page.locator('.is-spoken')).toHaveCount(0);
  const before = await speakCount(page);
  await page.waitForTimeout(400);
  expect(await speakCount(page)).toBe(before);
}

async function startListening(page: Page): Promise<void> {
  await page.keyboard.press('s');
}

test.use({ settings: { ttsAutoAdvance: true, ttsWordHighlight: true } });

test.beforeEach(async ({ page }) => {
  await installStubSpeech(page);
});

test('CUJ-15: listening follows the word and crosses cards', async ({ page }) => {
  await page.goto('/');
  await startReading(page, 'Слухаю', numberedText(30));
  await startListening(page);

  const spoken = page.locator('.card-slide .is-spoken');
  await expect(spoken).toHaveCount(1);
  const first = await spoken.textContent();
  await expect.poll(async () => spoken.textContent()).not.toBe(first);

  await expect.poll(async () => (await counter(page)).index, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
  // The queue carried the voice across cards: one cancel at the start, none since.
  const log = await speechLog(page);
  const firstSpeak = log.findIndex((e) => e.event === 'speak');
  expect(log.slice(firstSpeak).filter((e) => e.event === 'cancel')).toHaveLength(0);
  expect(log.find((e) => e.event === 'speak')?.lang).toBe('uk-UA');
});

test('CUJ-15: listening stops at the first card of the next chapter', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('input[type="file"][accept*=".epub"]')
    .setInputFiles(specBook('books/epub3-nav-fragments.epub'));
  await expect(page.getByLabel(uk.library.titleLabel)).toHaveValue('Тиха книга');
  await page.getByRole('button', { name: uk.library.start }).click();
  await expect(reader(page)).toBeVisible();

  const [doc] = await storedDocs(page);
  const chapters = doc.chapters!;
  const second = chapters.findIndex((c) => c.title === 'Розділ 2');
  const next = chapters[second + 1];
  expect(next.title).toBe('Частина друга');

  // Walk to the card where "Розділ 2" starts, then listen from there.
  while ((await visibleCardOffset(page, doc.title)) + 1 < chapters[second].offset) {
    await nextCard(page);
  }
  await startListening(page);

  await expect(page.getByRole('status').filter({ hasText: next.title })).toBeVisible({ timeout: 20_000 });
  await expectSilent(page);
  // The feed rests on the card where the new chapter begins, and progress says so.
  const offset = await visibleCardOffset(page, doc.title);
  expect(offset).toBeLessThanOrEqual(next.offset);
  await expect
    .poll(async () => (await storedDocs(page))[0].charOffset)
    .toBeGreaterThanOrEqual(offset);
  // Nothing of the new chapter was spoken.
  const chapterOpening = doc.text.slice(next.offset, next.offset + 20);
  const spokenTexts = (await speechLog(page)).filter((e) => e.event === 'speak').map((e) => e.text ?? '');
  expect(spokenTexts.some((t) => t.includes(chapterOpening))).toBe(false);
});

test('CUJ-15: a manual turn stops listening', async ({ page }) => {
  await page.goto('/');
  await startReading(page, 'Гортаю', numberedText(30));
  await startListening(page);
  await expect(page.locator('.is-spoken')).toHaveCount(1);
  await page.evaluate(() => ((window as unknown as { __speechPause: boolean }).__speechPause = true));
  await nextCard(page);
  await page.evaluate(() => ((window as unknown as { __speechPause: boolean }).__speechPause = false));
  await expectSilent(page);
});
