import { afterEach, describe, expect, it, vi } from 'vitest';
import { splitTextIntoCards } from '../../core/splitter/splitter';
import { WORKER_SPLIT_THRESHOLD } from './splitCards';

const longText = Array.from(
  { length: Math.ceil(WORKER_SPLIT_THRESHOLD / 40) + 10 },
  (_, i) => `Речення ${i + 1} розповідає про спокійне читання.`
)
  .map((s, i) => (i % 5 === 4 ? `${s}\n` : `${s} `))
  .join('');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('splitCards', () => {
  it('has a long text to test with', () => {
    expect(longText.length).toBeGreaterThanOrEqual(WORKER_SPLIT_THRESHOLD);
  });

  it('splits a short text right away, exactly like the splitter', async () => {
    const { splitCards } = await import('./splitCards');
    const text = 'Перше речення. Друге речення.\nТретє.';
    expect(await splitCards(text, 'short')).toEqual(splitTextIntoCards(text, { lengthPreset: 'short' }));
  });

  it('falls back to the main thread when there is no Worker', async () => {
    vi.stubGlobal('Worker', undefined);
    const { splitCards } = await import('./splitCards');
    expect(await splitCards(longText, 'medium')).toEqual(
      splitTextIntoCards(longText, { lengthPreset: 'medium' })
    );
  });

  it('uses a worker for a long text', async () => {
    const posted: unknown[] = [];
    class FakeWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      postMessage(data: { id: number; text: string; lengthPreset: 'long' }) {
        posted.push(data);
        const cards = splitTextIntoCards(data.text, { lengthPreset: data.lengthPreset });
        queueMicrotask(() => this.onmessage?.({ data: { id: data.id, cards } } as MessageEvent));
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', FakeWorker);
    const { splitCards } = await import('./splitCards');
    const cards = await splitCards(longText, 'long');
    expect(posted).toHaveLength(1);
    expect(cards).toEqual(splitTextIntoCards(longText, { lengthPreset: 'long' }));
  });

  it('falls back when the worker fails', async () => {
    class BrokenWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      postMessage() {
        queueMicrotask(() => this.onerror?.());
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', BrokenWorker);
    const { splitCards } = await import('./splitCards');
    expect(await splitCards(longText, 'short')).toEqual(
      splitTextIntoCards(longText, { lengthPreset: 'short' })
    );
  });
});
