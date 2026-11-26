import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isTtsSupported, speakCardText, stopSpeaking } from '../../../services/speech/tts';
import { useReaderStore } from '../../../store/useReaderStore';
import { useSettingsStore } from '../../../store/useSettingsStore';

interface Options {
  scrollToCard: (index: number, behavior?: ScrollBehavior) => void;
}

export interface Speech {
  ttsAvailable: boolean;
  isSpeaking: boolean;
  toggleSpeech: () => void;
}

/**
 * Read-aloud for the current card. With auto-advance on, the end of a card
 * scrolls to the next one, and speaking continues there.
 */
export function useSpeech({ scrollToCard }: Options): Speech {
  const cards = useReaderStore((s) => s.cards);
  const currentIndex = useReaderStore((s) => s.currentIndex);
  const recordTtsListened = useReaderStore((s) => s.recordTtsListened);
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const ttsAutoAdvance = useSettingsStore((s) => s.ttsAutoAdvance);

  const ttsAvailable = useMemo(() => isTtsSupported(), []);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const pendingAutoSpeakRef = useRef(false);

  const startSpeakingIndex = useCallback(
    (cardIndex: number) => {
      if (!ttsAvailable) return;
      const text = cards[cardIndex]?.text;
      if (!text) return;
      speakCardText(text, {
        rate: ttsRate,
        onStart: () => {
          setIsSpeaking(true);
          void recordTtsListened();
        },
        onComplete: () => {
          if (ttsAutoAdvance && cardIndex + 1 < cards.length) {
            pendingAutoSpeakRef.current = true;
            scrollToCard(cardIndex + 1);
          } else {
            setIsSpeaking(false);
          }
        },
        onStop: () => {
          pendingAutoSpeakRef.current = false;
          setIsSpeaking(false);
        }
      });
    },
    [ttsAvailable, cards, ttsRate, ttsAutoAdvance, recordTtsListened, scrollToCard]
  );

  // A card change continues an auto-advance, and stops any other speech.
  useEffect(() => {
    if (pendingAutoSpeakRef.current) {
      pendingAutoSpeakRef.current = false;
      startSpeakingIndex(currentIndex);
      return;
    }
    stopSpeaking();
    setIsSpeaking(false);
  }, [currentIndex, startSpeakingIndex]);

  const toggleSpeech = useCallback(() => {
    if (!ttsAvailable) return;
    if (isSpeaking) {
      pendingAutoSpeakRef.current = false;
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    startSpeakingIndex(currentIndex);
  }, [ttsAvailable, isSpeaking, currentIndex, startSpeakingIndex]);

  return { ttsAvailable, isSpeaking, toggleSpeech };
}
