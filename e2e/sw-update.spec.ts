import { readFile, writeFile } from 'node:fs/promises';
import { expect, nextCard, reader, startReading, test, uk } from './support/app';
import { numberedText } from './support/fixtures';

/**
 * IMP-15 (0.22): a new deploy never reloads the page on its own. The new
 * service worker waits; the library shows a quiet line with "Update now";
 * the reader never does.
 *
 * A deploy is simulated on disk: `registration.update()` is not routable, so
 * the test changes one character of a precache revision in `dist/sw.js` (same
 * length, which the static server needs) and restores it afterwards. Desktop
 * Chromium only, so no other run of this test touches the file at once.
 */
test.use({ serviceWorkers: 'allow' });
test.skip(
  ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
  'changes dist/sw.js; one project is enough'
);

const SW_PATH = new URL('../dist/sw.js', import.meta.url);

/** The same file with one revision character changed: a byte-different worker. */
function nextDeploy(sw: string): string {
  return sw.replace(/(url:"index\.html",revision:")(.)/, (_m, head: string, c: string) =>
    head + (c === '0' ? '1' : '0')
  );
}

const TITLE = 'Оновлення';

test('a new version waits: no reload mid-text, a quiet offer in the library', async ({ page }) => {
  const original = await readFile(SW_PATH, 'utf8');
  const deployed = nextDeploy(original);
  expect(deployed).not.toBe(original);
  expect(deployed.length).toBe(original.length);
  test.info().annotations.push({ type: 'note', description: 'dist/sw.js is restored after the test' });

  try {
    await runJourney(page, () => writeFile(SW_PATH, deployed));
  } finally {
    await writeFile(SW_PATH, original);
  }
});

async function runJourney(page: import('@playwright/test').Page, deploy: () => Promise<void>) {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })
      );
    }
    (window as unknown as { sameDocument: boolean }).sameDocument = true;
  });

  await startReading(page, TITLE, numberedText(30));
  await nextCard(page);

  // The deploy happens while a text is open.
  await deploy();
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
    await new Promise<void>((resolve) => {
      const check = () => (registration?.waiting ? resolve() : setTimeout(check, 50));
      check();
    });
  });

  // Still the same page, still the same card, and nothing about updates in the reader.
  await expect(reader(page)).toBeVisible();
  await expect(page.locator('.counter-btn')).toHaveText(/^2 \//);
  await expect(page.getByText(uk.library.update.ready)).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument)).toBe(true);

  // Back in the library, the offer is there.
  await page.getByRole('button', { name: uk.reader.library, exact: true }).click();
  await expect(page.getByText(uk.library.update.ready)).toBeVisible();

  // "Update now" activates the new version and reloads once.
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: uk.library.update.apply }).click()
  ]);
  await expect(page.getByRole('main', { name: uk.library.mainLabel })).toBeVisible();
  await expect(page.getByText(uk.library.update.ready)).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument)).toBeUndefined();
}
