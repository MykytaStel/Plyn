import {
  expect,
  expectStoredOffset,
  nextCard,
  openReaderSettings,
  startReading,
  storedDocs,
  test,
  uk,
  visibleCardOffset,
  visibleCardText
} from './support/app';
import { numberedText } from './support/fixtures';

const TITLE = 'Довжина картки';

test('CUJ-3: changing card length keeps the place and the bookmark', async ({ page }) => {
  await page.goto('/');
  await startReading(page, TITLE, numberedText(80));
  for (let i = 0; i < 6; i += 1) await nextCard(page);

  const offset = await visibleCardOffset(page, TITLE);
  const firstSentence = (await visibleCardText(page)).match(/^Речення \d+/)![0];
  await expectStoredOffset(page, TITLE, offset);

  // Bookmark this card with the keyboard (B, matched by physical key).
  await page.keyboard.press('KeyB');
  await expect.poll(async () => (await storedDocs(page))[0]?.bookmarkOffsets).toEqual([offset]);

  for (const length of ['short', 'long', 'medium'] as const) {
    await openReaderSettings(page);
    const settings = page.getByRole('dialog', { name: uk.settings.title });
    await settings
      .getByRole('radiogroup', { name: uk.settings.cardLength })
      .getByRole('radio', { name: uk.settings.lengths[length] })
      .click();
    await page.keyboard.press('Escape');
    await expect(settings).toHaveCount(0);

    // The card on screen still contains the sentence we were reading.
    await expect
      .poll(async () => visibleCardText(page))
      .toContain(`${firstSentence} розповідає`);
    // The bookmark still points to the same character, and the button shows it.
    expect((await storedDocs(page))[0].bookmarkOffsets).toEqual([offset]);
    await expect(
      page.getByRole('button', { name: uk.reader.bookmarkRemove })
    ).toHaveAttribute('aria-pressed', 'true');
  }
});
