import { defineConfig } from 'vitest/config';

/**
 * Two projects (docs/TESTING.md):
 * - node: pure logic, storage (fake-indexeddb) and property tests — `*.test.ts`
 * - dom:  code that needs a DOM (parsers, components) — `*.test.tsx`, `*.dom.test.ts`
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
          exclude: ['src/**/*.dom.test.ts']
        }
      },
      {
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx', 'src/**/*.dom.test.ts'],
          setupFiles: ['./test/setup-dom.ts']
        }
      }
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'worker/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/i18n/locales/**'],
      reporter: ['text-summary', 'json-summary', 'html']
    }
  }
});
