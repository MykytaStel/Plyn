import { expect, test } from './support/app';

/** IMP-16 (0.22): PNG icons for Android and iOS home screens, and a separate maskable one. */
test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile, 'static files; one project');

test('the manifest lists PNG icons and a maskable icon, and they all load', async ({ page, request }) => {
  await page.goto('/');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifestUrl = new URL(manifestHref!, page.url());
  const manifest = (await (await request.get(manifestUrl.href)).json()) as {
    icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
  };

  const png = (sizes: string, purpose: string) =>
    manifest.icons.find((i) => i.type === 'image/png' && i.sizes === sizes && i.purpose === purpose);
  expect(png('192x192', 'any')).toBeTruthy();
  expect(png('512x512', 'any')).toBeTruthy();
  expect(png('512x512', 'maskable')).toBeTruthy();
  // One purpose per image: "any maskable" crops the regular icon on Android.
  expect(manifest.icons.some((i) => (i.purpose ?? '').includes(' '))).toBe(false);

  const appleHref = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const urls = [...manifest.icons.map((i) => new URL(i.src, manifestUrl).href), new URL(appleHref!, page.url()).href];
  for (const url of urls) {
    const res = await request.get(url);
    expect(res.ok(), url).toBe(true);
  }
  expect(appleHref).toMatch(/\.png$/);
});
