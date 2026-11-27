import {
  counter,
  expect,
  expectCard,
  expectStoredOffset,
  nextCard,
  startReading,
  test,
  visibleCardOffset,
  visibleCardText
} from './support/app';
import { numberedText } from './support/fixtures';

const TITLE = 'Довга книжка';

test('CUJ-13: a book with thousands of cards keeps a few in the page and jumps anywhere', async ({
  page
}) => {
  await page.goto('/');
  await startReading(page, TITLE, numberedText(6000));
  const { total } = await counter(page);
  expect(total).toBeGreaterThan(2000);

  // Only the cards around the current one are in the page (0.25), plus the done slide.
  const slides = page.locator('.cards-feed .card-slide');
  expect(await slides.count()).toBeLessThanOrEqual(12);

  await nextCard(page);
  await nextCard(page);

  // A far jump from the scrubber lands on that card and saves the place.
  await page.locator('.counter-btn').click();
  const scrubber = page.locator('.scrubber-bar').getByRole('slider');
  await scrubber.fill('2000');
  await expectCard(page, 2000);
  await expect(page.locator('.card-slide[data-index="2000"] .card-text')).toBeVisible();
  expect(await slides.count()).toBeLessThanOrEqual(12);
  await page.keyboard.press('Escape');

  // Reading goes on from there one card at a time.
  await page.locator('.cards-feed').focus();
  await nextCard(page);
  const offset = await visibleCardOffset(page, TITLE);
  expect(await visibleCardText(page)).toMatch(/^Речення \d+/);
  await expectStoredOffset(page, TITLE, offset);
});
