import { defineConfig, devices } from '@playwright/test';

/**
 * L7/L8 (docs/TESTING.md): journeys in real browsers against the production
 * build served by `vite preview`, so the real service worker and lazy chunks run.
 */
const PORT = 4173;
const isCI = Boolean(process.env.CI);
// Optional: a Chromium already on this machine, when Playwright can't download
// its own (sandboxed setups). CI leaves it unset.
const chromiumLaunch = process.env.PW_CHROMIUM_EXECUTABLE
  ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } }
  : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: {
    timeout: 7_000,
    // Visual baseline (e2e/visual.spec.ts): still frames, small tolerance for
    // anti-aliasing differences between machines.
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 }
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'uk-UA',
    trace: 'retain-on-failure',
    // A service worker would hide requests from page.route(); the offline
    // journey (CUJ-5) turns it back on.
    serviceWorkers: 'block'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...chromiumLaunch } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'phone', use: { ...devices['Pixel 7'], ...chromiumLaunch } },
    { name: 'iphone', use: { ...devices['iPhone 14'] } }
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 180_000
  }
});
