import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detectContentLanguage } from '../../../core/language/detectContentLanguage';
import type { DocumentChapter } from '../../../core/models/types';
import { chapterStartingIn } from '../../../core/reading/chapterBoundary';
import type { WordRange } from '../../../core/speech/wordRange';
import { currentI18n, format } from '../../../i18n';
import {
  isTtsSupported,
  queueCardText,
  speakCardText,
  stopSpeaking,
  type SpeakOptions
} from '../../../services/speech/tts';
import { useReaderStore } from '../../../store/useReaderStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import type { ShowToast } from './useReaderToast';

interface Options {
  scrollToCard: (index: number, behavior?: ScrollBehavior) => void;
  chapters?: readonly DocumentChapter[];
  showToast?: ShowToast;
}

/** The word being spoken, in the text of card `cardIndex`. */
export interface SpokenRange extends WordRange {
  cardIndex: number;
}

export interface Speech {
  ttsAvailable: boolean;
  isSpeaking: boolean;
  toggleSpeech: () => void;
  spokenRange: SpokenRange | null;
}

/**
 * Read-aloud for the current card. With auto-advance on, the next card is
 * queued as soon as one starts, so the voice never waits for the scroll; the
 * feed follows when the queued card starts. Listening stops before a card
 * where a new chapter begins (0.26).
 */
export function useSpeech({ scrollToCard, chapters, showToast }: Options): Speech {
  const cards = useReaderStore((s) => s.cards);
  const currentIndex = useReaderStore((s) => s.currentIndex);
  const recordTtsListened = useReaderStore((s) => s.recordTtsListened);
  const rate = useSettingsStore((s) => s.ttsRate);
  const autoAdvance = useSettingsStore((s) => s.ttsAutoAdvance);
  const highlight = useSettingsStore((s) => s.ttsWordHighlight);
  const voices = useSettingsStore((s) => s.ttsVoices);

  const ttsAvailable = useMemo(() => isTtsSupported(), []);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenRange, setSpokenRange] = useState<SpokenRange | null>(null);

  // Callbacks live as long as an utterance does, so they read the latest
  // values from here: a settings change applies from the next card.
  const latest = useRef({ cards, chapters, rate, autoAdvance, highlight, voices, scrollToCard, showToast, recordTtsListened });
  useEffect(() => {
    latest.current = { cards, chapters, rate, autoAdvance, highlight, voices, scrollToCard, showToast, recordTtsListened };
  });

  /**
   * The furthest card the queue has moved the feed to. The feed reports cards
   * late (after a smooth scroll), so any index between the last one seen and
   * this target is the queue's own doing; anything else is a manual turn.
   */
  const autoTargetRef = useRef<number | null>(null);
  const lastIndexRef = useRef(currentIndex);
  /** The card already waiting in the speech queue, and what it was built with. */
  const queuedRef = useRef<{ index: number; build: string } | null>(null);

  /** What a card would be spoken with now: a change means rebuild it. */
  const buildKey = (index: number): string => {
    const l = latest.current;
    const text = l.cards[index]?.text ?? '';
    return `${l.rate}|${l.voices[detectContentLanguage(text)] ?? ''}|${l.highlight}`;
  };

  /** The chapter that begins after card `index` ends, up to the next card's end. */
  const chapterAfter = (index: number) => {
    const l = latest.current;
    const card = l.cards[index];
    const next = l.cards[index + 1];
    if (!card || !next) return null;
    return chapterStartingIn(l.chapters, { startOffset: card.endOffset, endOffset: next.endOffset });
  };

  const stopAll = useCallback(() => {
    autoTargetRef.current = null;
    queuedRef.current = null;
    stopSpeaking();
    setIsSpeaking(false);
    setSpokenRange(null);
  }, []);

  const follow = (index: number) => {
    autoTargetRef.current = Math.max(autoTargetRef.current ?? index, index);
    latest.current.scrollToCard(index);
  };

  const speakAt = useCallback((index: number, how: 'now' | 'queue' | 'follow') => {
    const l = latest.current;
    const card = l.cards[index];
    if (!card) return false;

    const options: SpeakOptions = {
      rate: l.rate,
      voiceURI: l.voices[detectContentLanguage(card.text)],
      onStart: () => {
        const s = latest.current;
        setIsSpeaking(true);
        setSpokenRange(null);
        void s.recordTtsListened();
        if (how !== 'now') follow(index);
        const next = s.cards[index + 1];
        if (s.autoAdvance && next && !chapterAfter(index)) {
          queuedRef.current = { index: index + 1, build: buildKey(index + 1) };
          if (!speakAt(index + 1, 'queue')) queuedRef.current = null;
        }
      },
      onWord: l.highlight ? (range) => setSpokenRange({ ...range, cardIndex: index }) : undefined,
      onNoWords: () => setSpokenRange(null),
      onComplete: () => {
        setSpokenRange(null);
        const s = latest.current;
        const queued = queuedRef.current;
        if (queued?.index === index + 1) {
          if (!s.autoAdvance) {
            stopAll();
          } else if (queued.build !== buildKey(index + 1)) {
            // Speed, voice or highlight changed: the next card starts with the new ones.
            queuedRef.current = null;
            speakAt(index + 1, 'follow');
          }
          return;
        }
        const next = s.cards[index + 1];
        if (!s.autoAdvance || !next) {
          stopAll();
          return;
        }
        const chapter = chapterAfter(index);
        if (chapter) {
          stopAll();
          follow(index + 1);
          s.showToast?.(format(currentI18n().m.reader.toasts.chapterStop, { title: chapter.title }));
          return;
        }
        // Auto-advance was turned on mid-card: nothing was queued yet.
        speakAt(index + 1, 'follow');
      },
      onStop: () => stopAll()
    };

    if (how === 'queue') return queueCardText(card.text, options);
    speakCardText(card.text, options);
    return true;
  }, [stopAll]);

  // The queue moving the feed keeps speaking; any other card change stops it.
  useEffect(() => {
    const last = lastIndexRef.current;
    lastIndexRef.current = currentIndex;
    const target = autoTargetRef.current;
    if (target !== null && currentIndex > last && currentIndex <= target) {
      if (currentIndex === target) autoTargetRef.current = null;
      return;
    }
    stopAll();
  }, [currentIndex, stopAll]);

  const toggleSpeech = useCallback(() => {
    if (!ttsAvailable) return;
    if (isSpeaking) {
      stopAll();
      return;
    }
    queuedRef.current = null;
    speakAt(currentIndex, 'now');
  }, [ttsAvailable, isSpeaking, currentIndex, speakAt, stopAll]);

  return { ttsAvailable, isSpeaking, toggleSpeech, spokenRange };
}
