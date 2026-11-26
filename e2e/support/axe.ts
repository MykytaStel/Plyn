import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { A11Y_EXCEPTIONS } from '../a11y-exceptions';

/** 0.20 gate: fail on serious and critical only. 0.28 tightens it (TESTING.md § L8). */
const BLOCKING = new Set(['serious', 'critical']);

export async function expectNoSeriousA11yIssues(page: Page, where: string): Promise<void> {
  // Let sheet and card transitions settle, so contrast is measured on final colours.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 350)))
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  if (process.env.AXE_DUMP) {
    const fs = await import('node:fs');
    for (const v of results.violations) {
      for (const n of v.nodes) {
        fs.appendFileSync(process.env.AXE_DUMP, JSON.stringify({ where, rule: v.id, impact: v.impact, target: n.target.join(' '), html: n.html.slice(0, 160), msg: n.failureSummary?.slice(0, 220) }) + '\n');
      }
    }
  }
  const isException = (rule: string, target: string) =>
    A11Y_EXCEPTIONS.some((e) => e.rule === rule && target.includes(e.selector));
  const blocking = results.violations
    .filter((v) => BLOCKING.has(v.impact ?? ''))
    .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !isException(v.id, n.target.join(' '))) }))
    .filter((v) => v.nodes.length > 0)
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.slice(0, 5).map((n) => n.target.join(' '))
    }));
  expect(blocking, `serious/critical axe violations in ${where}`).toEqual([]);
}
