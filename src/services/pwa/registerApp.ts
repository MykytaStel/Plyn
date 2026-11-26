import { registerSW } from 'virtual:pwa-register';
import { markUpdateReady } from './updates';

/** Checks for a new version when Plyn comes back to the foreground, at most hourly. */
const CHECK_INTERVAL_MS = 60 * 60_000;

export function registerAppServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () =>
      markUpdateReady(async () => {
        // The plugin reloads only for updates workbox-window found itself; an
        // update the browser found later ("external") needs this.
        navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
          once: true
        });
        await updateSW(true);
      }),
    onRegisteredSW: (_url, registration) => {
      if (!registration) return;
      let lastCheck = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
        lastCheck = Date.now();
        void registration.update().catch(() => {});
      });
    }
  });
}
