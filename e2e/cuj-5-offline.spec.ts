import {
  expect,
  expectCard,
  nextCard,
  reader,
  startReading,
  storedDocs,
  test,
  uk
} from './support/app';
import { numberedText } from './support/fixtures';

const TITLE = 'Без мережі';

// The real service worker is the point of this journey.
test.use({ serviceWorkers: 'allow' });

test('CUJ-5: load once, go offline, reload → library and reading work', async ({ page, context }) => {
  await page.goto('/');
  // Wait until the service worker controls the page and has precached the app.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })
      );
    }
  });
  await startReading(page, TITLE, numberedText(40));
  await nextCard(page);
  await page.getByRole('button', { name: uk.reader.library, exact: true }).click();
  // closeReader writes progress before the library shows; reload only after that.
  const library = page.getByRole('main', { name: uk.library.mainLabel });
  await expect(library).toBeVisible();
  expect((await storedDocs(page))[0].charOffset).toBeGreaterThan(0);

  await context.setOffline(true);
  await page.reload();
  await expect(library).toBeVisible();
  await library.getByRole('button', { name: new RegExp(TITLE) }).first().click();
  await expect(reader(page)).toBeVisible();
  await expectCard(page, 1);
  await nextCard(page);
  await page.getByRole('button', { name: uk.reader.library, exact: true }).click();

  // URL import says calmly that it needs the internet.
  await page.getByRole('button', { name: uk.library.expandEditor }).click();
  await page.getByRole('button', { name: uk.library.fromUrl }).click();
  await page.getByPlaceholder('https://example.com/article').fill('https://example.com/a');
  await page.getByRole('button', { name: uk.library.urlLoad }).click();
  await expect(page.getByRole('status')).toHaveText(uk.errors.offline);
});
