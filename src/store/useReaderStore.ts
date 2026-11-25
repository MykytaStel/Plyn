import { create } from 'zustand';
import type {
  CardLengthPreset,
  PlynDocument,
  ReadingCard
} from '../core/models/types';
import {
  findCardIndexByOffset,
  splitTextIntoCards
} from '../core/splitter/splitter';
import { createDocument, updateDocument } from '../services/storage/db';

interface ReaderState {
  activeDoc: PlynDocument | null;
  cards: ReadingCard[];
  currentIndex: number;
  timerMinutes: number;
  timerEndsAt: number;

  openDocument: (doc: PlynDocument, lengthPreset: CardLengthPreset) => void;
  startNewDocument: (
    title: string,
    text: string,
    lengthPreset: CardLengthPreset
  ) => Promise<void>;
  closeReader: () => Promise<void>;
  setCurrentIndex: (index: number) => void;
  recalculateCards: (lengthPreset: CardLengthPreset) => number;
  toggleBookmarkAtCurrent: () => Promise<boolean>;
  setFocusTimer: (minutes: number) => void;
  clearFocusTimer: () => void;
}

let persistTimeout: number | undefined;

function schedulePersist(doc: PlynDocument): void {
  window.clearTimeout(persistTimeout);
  persistTimeout = window.setTimeout(() => {
    void updateDocument(doc);
  }, 250);
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  activeDoc: null,
  cards: [],
  currentIndex: 0,
  timerMinutes: 0,
  timerEndsAt: 0,

  openDocument: (doc, lengthPreset) => {
    const cards = splitTextIntoCards(doc.text, { lengthPreset });
    if (cards.length === 0) return;

    const startIdx = findCardIndexByOffset(cards, doc.charOffset);
    const syncedDoc: PlynDocument = {
      ...doc,
      currentIndex: startIdx,
      totalCards: cards.length
    };

    set({
      activeDoc: syncedDoc,
      cards,
      currentIndex: startIdx
    });
  },

  startNewDocument: async (title, text, lengthPreset) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const cards = splitTextIntoCards(trimmed, { lengthPreset });
    if (cards.length === 0) return;

    const doc = await createDocument({
      title,
      text: trimmed,
      totalCards: cards.length
    });

    set({
      activeDoc: doc,
      cards,
      currentIndex: 0
    });
  },

  closeReader: async () => {
    const { activeDoc } = get();
    window.clearTimeout(persistTimeout);
    if (activeDoc) {
      await updateDocument(activeDoc);
    }
    set({
      activeDoc: null,
      cards: [],
      currentIndex: 0,
      timerMinutes: 0,
      timerEndsAt: 0
    });
  },

  setCurrentIndex: (index) => {
    const { activeDoc, cards } = get();
    if (!activeDoc || cards.length === 0) return;

    const clamped = Math.min(Math.max(0, index), cards.length - 1);
    const card = cards[clamped];
    const updatedDoc: PlynDocument = {
      ...activeDoc,
      currentIndex: clamped,
      charOffset: card.startOffset,
      totalCards: cards.length
    };

    set({ currentIndex: clamped, activeDoc: updatedDoc });
    schedulePersist(updatedDoc);
  },

  recalculateCards: (lengthPreset) => {
    const { activeDoc } = get();
    if (!activeDoc) return 0;

    const cards = splitTextIntoCards(activeDoc.text, { lengthPreset });
    if (cards.length === 0) return 0;

    const nextIdx = findCardIndexByOffset(cards, activeDoc.charOffset);
    const updatedDoc: PlynDocument = {
      ...activeDoc,
      currentIndex: nextIdx,
      totalCards: cards.length
    };

    set({ cards, currentIndex: nextIdx, activeDoc: updatedDoc });
    schedulePersist(updatedDoc);
    return nextIdx;
  },

  toggleBookmarkAtCurrent: async () => {
    const { activeDoc, cards, currentIndex } = get();
    if (!activeDoc || !cards[currentIndex]) return false;

    const card = cards[currentIndex];
    const existing = activeDoc.bookmarkOffsets;
    const alreadyInCard = existing.some(
      (offset) => offset >= card.startOffset && offset < card.endOffset
    );

    let nextOffsets: number[];
    let added = false;

    if (alreadyInCard) {
      nextOffsets = existing.filter(
        (offset) => offset < card.startOffset || offset >= card.endOffset
      );
    } else {
      nextOffsets = [...existing, card.startOffset].sort((a, b) => a - b);
      added = true;
    }

    const updatedDoc = await updateDocument({
      ...activeDoc,
      bookmarkOffsets: nextOffsets
    });

    set({ activeDoc: updatedDoc });
    return added;
  },

  setFocusTimer: (minutes) => {
    if (minutes <= 0) {
      set({ timerMinutes: 0, timerEndsAt: 0 });
      return;
    }
    set({
      timerMinutes: minutes,
      timerEndsAt: Date.now() + minutes * 60 * 1000
    });
  },

  clearFocusTimer: () => {
    set({ timerMinutes: 0, timerEndsAt: 0 });
  }
}));
