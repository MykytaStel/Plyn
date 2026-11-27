import type { ThoughtNote } from '../models/types';
import { toLocalDateKey } from '../reading/weeklyActivity';

/**
 * Formats parked thoughts as Markdown, grouped by text. Groups are ordered by
 * their newest thought; thoughts inside a group are newest first.
 */
export function formatThoughtsAsMarkdown(input: {
  thoughts: ThoughtNote[];
  labels: { title: string; untitled: string };
  formatDate: (ms: number) => string;
}): string {
  const { thoughts, labels, formatDate } = input;
  const groups = new Map<string, ThoughtNote[]>();
  const sorted = [...thoughts].sort((a, b) => b.createdAt - a.createdAt);
  for (const thought of sorted) {
    const key = thought.docTitle?.trim() || labels.untitled;
    const group = groups.get(key);
    if (group) group.push(thought);
    else groups.set(key, [thought]);
  }

  const lines: string[] = [`# ${labels.title}`];
  for (const [heading, items] of groups) {
    lines.push('', `## ${heading}`, '');
    for (const item of items) {
      const body = item.text.trim().replace(/^#/, '\\#').replace(/\r?\n/g, '\n  ');
      lines.push(`- ${body} (${formatDate(item.createdAt)})`);
    }
  }
  return lines.join('\n') + '\n';
}

/** `plyn-thoughts-YYYY-MM-DD.md` using the local date. */
export function thoughtsFileName(date: Date): string {
  return `plyn-thoughts-${toLocalDateKey(date)}.md`;
}
