import { create } from 'zustand';
import type {
  AchievementDefinition,
  CardLengthPreset,
  PlynDocument,
  ReadingCard
} from '../core/models/types';
import {
  findCardIndexByOffset,
  splitTextIntoCards
} from '../core/splitter/splitter';
import {
  createDocument,
  recordProgressDelta,
  updateDocument
} from '../services/storage/db';
import { stopSpeaking } from '../services/speech/tts';

interface ReaderState {
  activeDoc: PlynDocument | null;
  cards: ReadingCard[];
  currentIndex: number;
  timerMinutes: number;
  timerEndsAt: number;
  recentUnlocks: AchievementDefinition[];

  openDocument: (doc: PlynDocument, lengthPreset: CardLengthPreset) => void;
  startNewDocument: (
    title: string,
    text: string,
    lengthPreset: CardLengthPreset
  ) => Promise<void>;
  closeReader: () => Promise<void>;
  setCurrentIndex: (index: number, anchorMode: boolean) => void;
  markDocumentCompleted: () => Promise<void>;
  recalculateCards: (lengthPreset: CardLengthPreset) => number;
  toggleBookmarkAtCurrent: () => Promise<boolean>;
  setFocusTimer: (minutes: number) => void;
  completeFocusTimer: () => Promise<void>;
  clearFocusTimer: () => void;
  shiftRecentUnlock: () => void;
}

let persistTimeout: number | undefined;
const seenInSession = new Set<number>();

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
  recentUnlocks: [],

  openDocument: (doc, lengthPreset) => {
    const cards = splitTextIntoCards(doc.text, { lengthPreset });
    if (cards.length === 0) return;

    seenInSession.clear();
    const startIdx = findCardIndexByOffset(cards, doc.charOffset);
    seenInSession.add(startIdx);

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

    seenInSession.clear();
    seenInSession.add(0);

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
    stopSpeaking();
    const { activeDoc } = get();
    window.clearTimeout(persistTimeout);
    seenInSession.clear();
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

  setCurrentIndex: (index, anchorMode) => {
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

    // Зараховуємо прочитану картку в статистику раз за сесію
    if (!seenInSession.has(clamped)) {
      seenInSession.add(clamped);
      void recordProgressDelta({
        cardsRead: 1,
        anchorCardsRead: anchorMode ? 1 : 0
      }).then((unlocked) => {
        if (unlocked.length > 0) {
          set((s) => ({ recentUnlocks: [...s.recentUnlocks, ...unlocked] }));
        }
      });
    }
  },

  markDocumentCompleted: async () => {
    const { activeDoc } = get();
    if (!activeDoc || activeDoc.completedOnce) return;

    const updated = await updateDocument({
      ...activeDoc,
      completedOnce: true
    });
    set({ activeDoc: updated });

    const unlocked = await recordProgressDelta({ docsCompleted: 1 });
    if (unlocked.length > 0) {
      set((s) => ({ recentUnlocks: [...s.recentUnlocks, ...unlocked] }));
    }
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

    if (added) {
      const unlocked = await recordProgressDelta({ bookmarksCreated: 1 });
      if (unlocked.length > 0) {
        set((s) => ({ recentUnlocks: [...s.recentUnlocks, ...unlocked] }));
      }
    }

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

  completeFocusTimer: async () => {
    set({ timerMinutes: 0, timerEndsAt: 0 });
    const unlocked = await recordProgressDelta({ timerSessionsCompleted: 1 });
    if (unlocked.length > 0) {
      set((s) => ({ recentUnlocks: [...s.recentUnlocks, ...unlocked] }));
    }
  },

  clearFocusTimer: () => {
    set({ timerMinutes: 0, timerEndsAt: 0 });
  },

  shiftRecentUnlock: () => {
    set((s) => ({ recentUnlocks: s.recentUnlocks.slice(1) }));
  }
}));
