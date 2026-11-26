export type ReaderToggle =
  | 'anchor'
  | 'sentenceFocus'
  | 'bookmark'
  | 'speech'
  | 'zen'
  | 'thoughts';

/**
 * Single-letter reader toggles, matched by physical key (`KeyboardEvent.code`)
 * so they work the same in Latin, Ukrainian or any other layout.
 */
const TOGGLES_BY_CODE: Record<string, ReaderToggle> = {
  KeyA: 'anchor',
  KeyF: 'sentenceFocus',
  KeyB: 'bookmark',
  KeyS: 'speech',
  KeyZ: 'zen',
  KeyN: 'thoughts'
};

export function readerToggleFor(e: Pick<KeyboardEvent, 'code'>): ReaderToggle | null {
  return TOGGLES_BY_CODE[e.code] ?? null;
}
