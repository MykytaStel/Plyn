import {
  expect,
  expectCard,
  expectStoredOffset,
  nextCard,
  reader,
  startReading,
  test,
  uk,
  visibleCardOffset,
  visibleCardText
} from './support/app';
import { numberedText } from './support/fixtures';

const TITLE = 'Повернення до місця';

test('CUJ-2: paste → read 10 cards → reload → the same card and charOffset', async ({ page }) => {
  await page.goto('/');
  await startReading(page, TITLE, numberedText(80));

  for (let i = 0; i < 10; i += 1) await nextCard(page);
  await expectCard(page, 10);
  const cardText = await visibleCardText(page);
  const offset = await visibleCardOffset(page, TITLE);
  expect(offset).toBeGreaterThan(0);
  await expectStoredOffset(page, TITLE, offset);

  await page.reload();
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  await expect(library).toBeVisible();
  await library.getByRole('button', { name: new RegExp(TITLE) }).first().click();

  await expect(reader(page)).toBeVisible();
  await expectCard(page, 10);
  expect(await visibleCardText(page)).toBe(cardText);
  await expectStoredOffset(page, TITLE, offset);
});

test('CUJ-2: a reload right after a swipe keeps that card', async ({ page }) => {
  await page.goto('/');
  await startReading(page, TITLE, numberedText(40));
  await nextCard(page);
  await nextCard(page);
  const offset = await visibleCardOffset(page, TITLE);
  // No waiting for the debounced write: the page goes away at once.
  await page.reload();
  await expectStoredOffset(page, TITLE, offset);
  // And the library opens it there.
  await page
    .getByRole('main', { name: uk.library.mainLabel })
    .getByRole('button', { name: new RegExp(TITLE) })
    .first()
    .click();
  await expectCard(page, 2);
});
