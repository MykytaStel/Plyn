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

  /** The card index the queue itself moved to; any other change is a manual turn. */
  const expectedIndexRef = useRef<number | null>(null);
  /** The card already waiting in the speech queue. */
  const queuedIndexRef = useRef<number | null>(null);

  const speakAt = useCallback((index: number, how: 'now' | 'queue' | 'follow') => {
    const l = latest.current;
    const card = l.cards[index];
    if (!card) return;

    const options: SpeakOptions = {
      rate: l.rate,
      voiceURI: l.voices[detectContentLanguage(card.text)],
      onStart: () => {
        const s = latest.current;
        setIsSpeaking(true);
        setSpokenRange(null);
        void s.recordTtsListened();
        if (how !== 'now') {
          expectedIndexRef.current = index;
          s.scrollToCard(index);
        }
        const next = s.cards[index + 1];
        if (s.autoAdvance && next && !chapterStartingIn(s.chapters, next)) {
          queuedIndexRef.current = index + 1;
          speakAt(index + 1, 'queue');
        }
      },
      onWord: l.highlight ? (range) => setSpokenRange({ ...range, cardIndex: index }) : undefined,
      onNoWords: () => setSpokenRange(null),
      onComplete: () => {
        setSpokenRange(null);
        if (queuedIndexRef.current === index + 1) return; // the queued card takes over
        const s = latest.current;
        const next = s.cards[index + 1];
        if (!s.autoAdvance || !next) {
          setIsSpeaking(false);
          return;
        }
        const chapter = chapterStartingIn(s.chapters, next);
        if (chapter) {
          setIsSpeaking(false);
          expectedIndexRef.current = index + 1;
          s.scrollToCard(index + 1);
          s.showToast?.(format(currentI18n().m.reader.toasts.chapterStop, { title: chapter.title }));
          return;
        }
        // Auto-advance was turned on mid-card: nothing was queued yet.
        speakAt(index + 1, 'follow');
      },
      onStop: () => {
        setIsSpeaking(false);
        setSpokenRange(null);
      }
    };

    if (how === 'queue') queueCardText(card.text, options);
    else speakCardText(card.text, options);
  }, []);

  const stopAll = useCallback(() => {
    expectedIndexRef.current = null;
    queuedIndexRef.current = null;
    stopSpeaking();
    setIsSpeaking(false);
    setSpokenRange(null);
  }, []);

  // The queue moving the feed keeps speaking; any other card change stops it.
  useEffect(() => {
    if (expectedIndexRef.current === currentIndex) {
      expectedIndexRef.current = null;
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
    queuedIndexRef.current = null;
    speakAt(currentIndex, 'now');
  }, [ttsAvailable, isSpeaking, currentIndex, speakAt, stopAll]);

  return { ttsAvailable, isSpeaking, toggleSpeech, spokenRange };
}
