import type { CardLengthPreset, ReadingCard } from '../../core/models/types';
import { splitTextIntoCards } from '../../core/splitter/splitter';

/** Texts at least this long are split in a Web Worker (about 60 book pages). */
export const WORKER_SPLIT_THRESHOLD = 100_000;

export interface SplitRequest {
  id: number;
  text: string;
  lengthPreset: CardLengthPreset;
}

export interface SplitResponse {
  id: number;
  /** null when the worker failed; the caller then splits on the main thread. */
  cards: ReadingCard[] | null;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (cards: ReadingCard[] | null) => void>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('./splitter.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
  worker.onmessage = (event: MessageEvent<SplitResponse>) => {
    pending.get(event.data.id)?.(event.data.cards);
    pending.delete(event.data.id);
  };
  worker.onerror = () => {
    // A broken worker (blocked, failed to load) answers nothing: settle every
    // request with null so it falls back, and do not use the worker again.
    for (const resolve of pending.values()) resolve(null);
    pending.clear();
    worker?.terminate();
    worker = null;
    workerBroken = true;
  };
  return worker;
}

let workerBroken = false;

/**
 * Cards for a text. Short texts split right away; long ones in a Web Worker,
 * falling back to the main thread if workers are unavailable. The result is
 * exactly `splitTextIntoCards` either way.
 */
export async function splitCards(
  text: string,
  lengthPreset: CardLengthPreset
): Promise<ReadingCard[]> {
  const inline = () => splitTextIntoCards(text, { lengthPreset });
  if (text.length < WORKER_SPLIT_THRESHOLD || workerBroken) return inline();
  const w = getWorker();
  if (!w) return inline();

  const id = nextId;
  nextId += 1;
  const cards = await new Promise<ReadingCard[] | null>((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ id, text, lengthPreset } satisfies SplitRequest);
  });
  return cards ?? inline();
}
