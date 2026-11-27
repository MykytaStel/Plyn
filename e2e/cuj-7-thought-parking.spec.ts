import {
  counter,
  expect,
  expectCard,
  expectStoredOffset,
  nextCard,
  reader,
  savedFile,
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

test('CUJ-7: the Done screen offers this reading’s thoughts and they export to Markdown', async ({
  page
}) => {
  await page.goto('/');
  await startReading(page, TITLE, numberedText(8));
  await page.keyboard.press('KeyN');
  const sheet = page.getByRole('dialog', { name: uk.thoughts.title });
  await sheet.getByRole('textbox').fill(THOUGHT);
  await sheet.getByRole('textbox').press('Enter');
  await expect(sheet.getByText(THOUGHT)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();

  // Read to the end: the Done card is the slide after the last text card.
  const done = page.getByRole('heading', { name: uk.reader.doneSlide.title });
  const { total } = await counter(page);
  for (let i = 0; i < total - 1; i += 1) await nextCard(page);
  await page.keyboard.press('ArrowDown');
  await expect(done).toBeInViewport();
  await expect(page.getByText(uk.reader.doneSlide.thoughts.one.replace('{count}', '1'))).toBeVisible();

  await page.getByRole('button', { name: uk.reader.doneSlide.viewThoughts }).click();
  const thoughts = page.getByRole('dialog', { name: uk.thoughts.title });
  await expect(thoughts.getByRole('heading', { name: uk.thoughts.thisSession })).toBeVisible();
  await expect(thoughts.getByText(THOUGHT)).toBeVisible();

  const file = await savedFile(page, () =>
    thoughts.getByRole('button', { name: uk.thoughts.export }).click()
  );
  expect(file.name).toMatch(/^plyn-thoughts-\d{4}-\d{2}-\d{2}\.md$/);
  expect(file.text).toContain(THOUGHT);
  await expect(thoughts.getByRole('status')).toHaveText(uk.thoughts.exported);
});
