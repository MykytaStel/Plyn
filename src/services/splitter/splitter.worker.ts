/// <reference lib="webworker" />
import { splitTextIntoCards } from '../../core/splitter/splitter';
import type { SplitRequest, SplitResponse } from './splitCards';

// Splits a long text off the main thread (0.25), so opening a big book or
// changing the card length never freezes the page.
self.onmessage = (event: MessageEvent<SplitRequest>) => {
  const { id, text, lengthPreset } = event.data;
  let response: SplitResponse;
  try {
    response = { id, cards: splitTextIntoCards(text, { lengthPreset }) };
  } catch {
    response = { id, cards: null };
  }
  self.postMessage(response);
};
