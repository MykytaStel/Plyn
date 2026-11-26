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
  findDocumentByText,
  recordProgressDelta,
  updateDocument
} from '../services/storage/db';
import {
  clearProgressJournal,
  writeProgressJournal
} from '../services/storage/progressJournal';
import { stopSpeaking } from '../services/speech/tts';
import { currentI18n } from '../i18n';

interface ReaderState {
  activeDoc: PlynDocument | null;
  cards: ReadingCard[];
  currentIndex: number;
  timerMinutes: number;
  timerEndsAt: number;
  microGoalTarget: number | null;
  microGoalCount: number;
  microGoalCompleted: boolean;
  recentUnlocks: AchievementDefinition[];

  openDocument: (
    doc: PlynDocument,
    lengthPreset: CardLengthPreset,
    microGoalTarget?: number | null
  ) => void;
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
  setBookmarkNote: (offset: number, note: string) => Promise<void>;
  setFocusTimer: (minutes: number) => void;
  completeFocusTimer: () => Promise<void>;
  recordTtsListened: () => Promise<void>;
  recordZenModeUsed: () => Promise<void>;
  clearFocusTimer: () => void;
  shiftRecentUnlock: () => void;
}

let persistTimeout: number | undefined;
const seenInSession = new Set<number>();

/**
 * The place is journaled synchronously at once (survives a reload or a closed
 * app), and written to IndexedDB after a short pause, so fast swiping through
 * a long book does not rewrite the whole document on every card.
 */
function schedulePersist(doc: PlynDocument): void {
  const at = Date.now();
  writeProgressJournal({
    id: doc.id,
    charOffset: doc.charOffset,
    currentIndex: doc.currentIndex,
    totalCards: doc.totalCards,
    at
  });
  window.clearTimeout(persistTimeout);
  persistTimeout = window.setTimeout(() => {
    // Write the document as it is now, not as it was at the swipe: a bookmark,
    // note or "completed" saved during the pause must not be overwritten.
    const latest = useReaderStore.getState().activeDoc;
    const toWrite = latest?.id === doc.id ? latest : doc;
    void updateDocument(toWrite).then(() => clearProgressJournal(doc.id, at));
  }, 250);
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  activeDoc: null,
  cards: [],
  currentIndex: 0,
  timerMinutes: 0,
  timerEndsAt: 0,
  microGoalTarget: null,
  microGoalCount: 0,
  microGoalCompleted: false,
  recentUnlocks: [],

  openDocument: (doc, lengthPreset, microGoalTarget = null) => {
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
      currentIndex: startIdx,
      microGoalTarget,
      microGoalCount: microGoalTarget ? 1 : 0,
      microGoalCompleted: false
    });
  },

  startNewDocument: async (title, text, lengthPreset) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // The same text again (the sample, a re-pasted article) opens the copy
    // already in the library, with its progress, instead of a duplicate.
    const existing = await findDocumentByText(trimmed);
    if (existing) {
      get().openDocument(existing, lengthPreset);
      return;
    }

    const cards = splitTextIntoCards(trimmed, { lengthPreset });
    if (cards.length === 0) return;

    seenInSession.clear();
    seenInSession.add(0);

    const doc = await createDocument({
      title,
      text: trimmed,
      totalCards: cards.length,
      fallbackTitle: currentI18n().m.common.untitled
    });

    set({
      activeDoc: doc,
      cards,
      currentIndex: 0,
      microGoalTarget: null,
      microGoalCount: 0,
      microGoalCompleted: false
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
      timerEndsAt: 0,
      microGoalTarget: null,
      microGoalCount: 0,
      microGoalCompleted: false
    });
  },

  setCurrentIndex: (index, anchorMode) => {
    const { activeDoc, cards, microGoalTarget, microGoalCount, microGoalCompleted } =
      get();
    if (!activeDoc || cards.length === 0) return;

    const clamped = Math.min(Math.max(0, index), cards.length - 1);
    const card = cards[clamped];
    const updatedDoc: PlynDocument = {
      ...activeDoc,
      currentIndex: clamped,
      charOffset: card.startOffset,
      totalCards: cards.length
    };

    const isNewInSession = !seenInSession.has(clamped);
    let nextGoalCount = microGoalCount;
    let nextGoalCompleted = microGoalCompleted;

    if (isNewInSession) {
      seenInSession.add(clamped);
      if (microGoalTarget && !microGoalCompleted) {
        nextGoalCount = microGoalCount + 1;
        if (nextGoalCount >= microGoalTarget) {
          nextGoalCompleted = true;
        }
      }
    }

    set({
      currentIndex: clamped,
      activeDoc: updatedDoc,
      microGoalCount: nextGoalCount,
      microGoalCompleted: nextGoalCompleted
    });
    schedulePersist(updatedDoc);

    if (isNewInSession) {
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
    const nextNotes = { ...(activeDoc.bookmarkNotes || {}) };
    let added = false;

    if (alreadyInCard) {
      nextOffsets = existing.filter((offset) => {
        const inCard = offset >= card.startOffset && offset < card.endOffset;
        if (inCard) delete nextNotes[String(offset)];
        return !inCard;
      });
    } else {
      nextOffsets = [...existing, card.startOffset].sort((a, b) => a - b);
      added = true;
    }

    const updatedDoc = await updateDocument({
      ...activeDoc,
      bookmarkOffsets: nextOffsets,
      bookmarkNotes: nextNotes
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

  setBookmarkNote: async (offset, note) => {
    const { activeDoc } = get();
    if (!activeDoc) return;

    const nextNotes = { ...(activeDoc.bookmarkNotes || {}) };
    const trimmed = note.trim();
    if (trimmed) {
      nextNotes[String(offset)] = trimmed;
    } else {
      delete nextNotes[String(offset)];
    }

    const updatedDoc = await updateDocument({
      ...activeDoc,
      bookmarkNotes: nextNotes
    });
    set({ activeDoc: updatedDoc });
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

  recordTtsListened: async () => {
    const unlocked = await recordProgressDelta({ ttsCardsListened: 1 });
    if (unlocked.length > 0) {
      set((s) => ({ recentUnlocks: [...s.recentUnlocks, ...unlocked] }));
    }
  },

  recordZenModeUsed: async () => {
    const unlocked = await recordProgressDelta({ zenModeUsed: 1 });
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
