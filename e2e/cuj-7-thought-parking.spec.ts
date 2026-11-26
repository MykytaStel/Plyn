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

const TITLE = 'Думки на паузі';
const THOUGHT = 'Відповісти Олі';

test('CUJ-7: park a thought mid-text → find it in the library → return to the text', async ({ page }) => {
  await page.goto('/');
  await startReading(page, TITLE, numberedText(40));
  await nextCard(page);
  await nextCard(page);
  await nextCard(page);
  const cardText = await visibleCardText(page);
  const offset = await visibleCardOffset(page, TITLE);

  // Park it without leaving the text.
  await page.keyboard.press('KeyN');
  const sheet = page.getByRole('dialog', { name: uk.thoughts.title });
  await sheet.getByRole('textbox').fill(THOUGHT);
  await sheet.getByRole('textbox').press('Enter');
  await expect(sheet.getByText(THOUGHT)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expectCard(page, 3);
  expect(await visibleCardText(page)).toBe(cardText);
  await expectStoredOffset(page, TITLE, offset);

  // In the library, the thought says which text it came from.
  await page.getByRole('button', { name: uk.reader.library, exact: true }).click();
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  await library.getByRole('button', { name: new RegExp(uk.library.thoughtsLabel) }).click();
  const thoughts = page.getByRole('dialog', { name: uk.thoughts.title });
  await expect(thoughts.getByText(THOUGHT)).toBeVisible();
  await expect(thoughts.getByText(`${uk.thoughts.during} ${TITLE}`)).toBeVisible();
  await page.keyboard.press('Escape');

  // And the text opens where the reader left it.
  await library.getByRole('button', { name: uk.libraryCard.open.replace('{title}', TITLE) }).click();
  await expect(reader(page)).toBeVisible();
  await expectCard(page, 3);
  expect(await visibleCardText(page)).toBe(cardText);
});
