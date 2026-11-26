import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import type { ReadingCard } from '../../../core/models/types';
import { splitCardIntoSentences } from '../../../core/splitter/sentences';
import { useReaderStore } from '../../../store/useReaderStore';

interface Options {
  feedRef: RefObject<HTMLDivElement | null>;
  sentenceFocus: boolean;
  anchorMode: boolean;
  /** The "done" slide came into view. */
  onReachDone: () => void;
}

export interface CardNavigation {
  isDoneVisible: boolean;
  activeSentenceIndex: number;
  scrollToCard: (index: number, behavior?: ScrollBehavior) => void;
  /** Next sentence in sentence focus, otherwise the next card. */
  advanceStep: () => void;
  retreatStep: () => void;
}

/**
 * The card feed: which card is on screen (IntersectionObserver → store), the
 * sentence in focus, and moving forwards and backwards.
 */
export function useCardNavigation({
  feedRef,
  sentenceFocus,
  anchorMode,
  onReachDone
}: Options): CardNavigation {
  const activeDocId = useReaderStore((s) => s.activeDoc?.id);
  const cards: ReadingCard[] = useReaderStore((s) => s.cards);
  const currentIndex = useReaderStore((s) => s.currentIndex);
  const setCurrentIndex = useReaderStore((s) => s.setCurrentIndex);
  const markDocumentCompleted = useReaderStore((s) => s.markDocumentCompleted);

  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [isDoneVisible, setIsDoneVisible] = useState(false);

  const currentSentenceCount = useMemo(() => {
    const text = cards[currentIndex]?.text;
    if (!sentenceFocus || !text) return 1;
    return Math.max(1, splitCardIntoSentences(text).length);
  }, [cards, currentIndex, sentenceFocus]);

  const scrollToCard = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const feed = feedRef.current;
      if (!feed) return;
      const slides = feed.querySelectorAll('.card-slide');
      const clamped = Math.min(Math.max(0, index), slides.length - 1);
      slides[clamped]?.scrollIntoView({ behavior, block: 'start' });
    },
    [feedRef]
  );

  const getVisibleSlideIndex = useCallback(() => {
    const feed = feedRef.current;
    if (!feed) return currentIndex;
    const height = feed.clientHeight || window.innerHeight;
    return Math.round(feed.scrollTop / height);
  }, [feedRef, currentIndex]);

  const advanceStep = useCallback(() => {
    if (sentenceFocus && !isDoneVisible && activeSentenceIndex < currentSentenceCount - 1) {
      setActiveSentenceIndex((prev) => prev + 1);
      return;
    }
    scrollToCard(getVisibleSlideIndex() + 1);
  }, [sentenceFocus, isDoneVisible, activeSentenceIndex, currentSentenceCount, scrollToCard, getVisibleSlideIndex]);

  const retreatStep = useCallback(() => {
    if (sentenceFocus && !isDoneVisible && activeSentenceIndex > 0) {
      setActiveSentenceIndex((prev) => prev - 1);
      return;
    }
    scrollToCard(getVisibleSlideIndex() - 1);
  }, [sentenceFocus, isDoneVisible, activeSentenceIndex, scrollToCard, getVisibleSlideIndex]);

  // A newly opened text starts at its saved card, with the keyboard on the feed.
  useEffect(() => {
    if (!activeDocId) return;
    requestAnimationFrame(() => {
      scrollToCard(useReaderStore.getState().currentIndex, 'instant');
      feedRef.current?.focus({ preventScroll: true });
    });
  }, [activeDocId, scrollToCard, feedRef]);

  // Every new card starts at its first sentence.
  useEffect(() => {
    setActiveSentenceIndex(0);
  }, [currentIndex, cards]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) continue;
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isNaN(idx)) continue;
          if (idx >= cards.length) {
            setIsDoneVisible(true);
            onReachDone();
            void markDocumentCompleted();
          } else {
            setIsDoneVisible(false);
            setCurrentIndex(idx, anchorMode);
          }
        }
      },
      { root: feed, threshold: 0.6 }
    );

    feed.querySelectorAll('.card-slide').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [feedRef, cards, anchorMode, setCurrentIndex, markDocumentCompleted, onReachDone]);

  return { isDoneVisible, activeSentenceIndex, scrollToCard, advanceStep, retreatStep };
}
