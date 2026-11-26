import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  EyeOff,
  Lightbulb,
  MoreHorizontal,
  SlidersHorizontal,
  Square,
  Volume2
} from 'lucide-react';
import type { CardLengthPreset } from '../../core/models/types';
import { estimateRemainingMinutes } from '../../core/reading/readingStats';
import { splitCardIntoSentences } from '../../core/splitter/sentences';
import {
  isBrownNoisePlaying,
  startBrownNoise,
  stopBrownNoise
} from '../../services/audio/brownNoise';
import {
  isTtsSupported,
  speakCardText,
  stopSpeaking
} from '../../services/speech/tts';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SettingsSheet } from '../settings/SettingsSheet';
import { ThoughtsSheet } from '../thoughts/ThoughtsSheet';
import { BookmarksSheet } from './BookmarksSheet';
import { ReaderToolsSheet } from './ReaderToolsSheet';
import { currentI18n, useI18n } from '../../i18n';
import { readerToggleFor } from './shortcuts';
import { CardSlide } from './CardSlide';
import { DoneSlide } from './DoneSlide';

type ActiveSheet = 'none' | 'settings' | 'bookmarks' | 'thoughts' | 'tools';
const RENDER_WINDOW_RADIUS = 5;
const EYE_BREAK_INTERVAL = 25;

function getPreviousTailSnippet(prevText?: string): string | undefined {
  if (!prevText) return undefined;
  const trimmed = prevText.trim();
  if (trimmed.length <= 72) return trimmed;
  const slice = trimmed.slice(-72);
  const firstSpace = slice.indexOf(' ');
  return (firstSpace > 0 ? slice.slice(firstSpace + 1) : slice).trim();
}

export function ReaderView() {
  const i18n = useI18n();
  const t = i18n.m.reader;
  /** Effects and handlers read copy at call time, so a language switch applies immediately. */
  const toasts = () => currentI18n().m.reader.toasts;
  const activeDoc = useReaderStore((s) => s.activeDoc);
  const cards = useReaderStore((s) => s.cards);
  const currentIndex = useReaderStore((s) => s.currentIndex);
  const timerEndsAt = useReaderStore((s) => s.timerEndsAt);
  const microGoalTarget = useReaderStore((s) => s.microGoalTarget);
  const microGoalCount = useReaderStore((s) => s.microGoalCount);
  const microGoalCompleted = useReaderStore((s) => s.microGoalCompleted);
  const recentUnlocks = useReaderStore((s) => s.recentUnlocks);
  const closeReader = useReaderStore((s) => s.closeReader);
  const setCurrentIndex = useReaderStore((s) => s.setCurrentIndex);
  const markDocumentCompleted = useReaderStore((s) => s.markDocumentCompleted);
  const recalculateCards = useReaderStore((s) => s.recalculateCards);
  const toggleBookmarkAtCurrent = useReaderStore(
    (s) => s.toggleBookmarkAtCurrent
  );
  const setBookmarkNote = useReaderStore((s) => s.setBookmarkNote);
  const setFocusTimer = useReaderStore((s) => s.setFocusTimer);
  const completeFocusTimer = useReaderStore((s) => s.completeFocusTimer);
  const recordTtsListened = useReaderStore((s) => s.recordTtsListened);
  const recordZenModeUsed = useReaderStore((s) => s.recordZenModeUsed);
  const shiftRecentUnlock = useReaderStore((s) => s.shiftRecentUnlock);

  const anchorMode = useSettingsStore((s) => s.anchorMode);
  const sentenceFocus = useSettingsStore((s) => s.sentenceFocus);
  const eyeBreakReminder = useSettingsStore((s) => s.eyeBreakReminder);
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const ttsAutoAdvance = useSettingsStore((s) => s.ttsAutoAdvance);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [sheet, setSheet] = useState<ActiveSheet>('none');
  const [showScrubber, setShowScrubber] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [brownNoiseOn, setBrownNoiseOn] = useState(() => isBrownNoisePlaying());
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [isDoneVisible, setIsDoneVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toast, setToast] = useState<{
    text: string;
    isAchievement?: boolean;
  } | null>(null);
  const [timerLabel, setTimerLabel] = useState('');

  const feedRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const pendingAutoSpeakRef = useRef(false);
  const microGoalNotifiedRef = useRef(false);
  const sessionCardsSeenRef = useRef(new Set<number>());
  const ttsAvailable = useMemo(() => isTtsSupported(), []);

  const currentSentenceCount = useMemo(() => {
    const text = cards[currentIndex]?.text;
    if (!sentenceFocus || !text) return 1;
    return Math.max(1, splitCardIntoSentences(text).length);
  }, [cards, currentIndex, sentenceFocus]);

  const showToast = useCallback((text: string, isAchievement = false) => {
    setToast({ text, isAchievement });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(
      () => setToast(null),
      isAchievement ? 4200 : 2800
    );
  }, []);

  // Зупиняємо коричневий шум при виході з рідера
  useEffect(() => {
    return () => {
      stopBrownNoise();
    };
  }, []);

  useEffect(() => {
    if (recentUnlocks.length === 0) return;
    const next = recentUnlocks[0];
    showToast(
      currentI18n().format(toasts().newReward, {
        title: currentI18n().m.achievements[next.id].title
      }),
      true
    );
    shiftRecentUnlock();
  }, [recentUnlocks, shiftRecentUnlock, showToast]);

  useEffect(() => {
    if (microGoalTarget && microGoalCompleted && !microGoalNotifiedRef.current) {
      microGoalNotifiedRef.current = true;
      showToast(
        currentI18n().plural(toasts().goalReached, microGoalTarget),
        true
      );
    }
    if (!microGoalTarget) {
      microGoalNotifiedRef.current = false;
    }
  }, [microGoalTarget, microGoalCompleted, showToast]);

  // Опційне м'яке нагадування для очей (правило 20-20-20) кожні 25 карток
  useEffect(() => {
    if (!eyeBreakReminder) return;
    sessionCardsSeenRef.current.add(currentIndex);
    const count = sessionCardsSeenRef.current.size;
    if (count > 1 && count % EYE_BREAK_INTERVAL === 0) {
      showToast(
        toasts().eyeBreak,
        true
      );
    }
  }, [currentIndex, eyeBreakReminder, showToast]);

  const scrollToCard = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const feed = feedRef.current;
      if (!feed) return;
      const slides = feed.querySelectorAll('.card-slide');
      const clamped = Math.min(Math.max(0, index), slides.length - 1);
      slides[clamped]?.scrollIntoView({ behavior, block: 'start' });
    },
    []
  );

  const getVisibleSlideIndex = useCallback(() => {
    const feed = feedRef.current;
    if (!feed) return currentIndex;
    const height = feed.clientHeight || window.innerHeight;
    return Math.round(feed.scrollTop / height);
  }, [currentIndex]);

  const advanceStep = useCallback(() => {
    if (
      sentenceFocus &&
      !isDoneVisible &&
      activeSentenceIndex < currentSentenceCount - 1
    ) {
      setActiveSentenceIndex((prev) => prev + 1);
      return;
    }
    scrollToCard(getVisibleSlideIndex() + 1);
  }, [
    sentenceFocus,
    isDoneVisible,
    activeSentenceIndex,
    currentSentenceCount,
    scrollToCard,
    getVisibleSlideIndex
  ]);

  const retreatStep = useCallback(() => {
    if (sentenceFocus && !isDoneVisible && activeSentenceIndex > 0) {
      setActiveSentenceIndex((prev) => prev - 1);
      return;
    }
    scrollToCard(getVisibleSlideIndex() - 1);
  }, [
    sentenceFocus,
    isDoneVisible,
    activeSentenceIndex,
    scrollToCard,
    getVisibleSlideIndex
  ]);

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

  useEffect(() => {
    if (!activeDoc) return;
    sessionCardsSeenRef.current.clear();
    requestAnimationFrame(() => {
      scrollToCard(currentIndex, 'instant');
      feedRef.current?.focus({ preventScroll: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc?.id]);

  useEffect(() => {
    setActiveSentenceIndex(0);
    if (pendingAutoSpeakRef.current) {
      pendingAutoSpeakRef.current = false;
      startSpeakingIndex(currentIndex);
      return;
    }
    stopSpeaking();
    setIsSpeaking(false);
  }, [currentIndex, startSpeakingIndex]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (Number.isNaN(idx)) continue;
            if (idx >= cards.length) {
              setIsDoneVisible(true);
              setZenMode(false);
              void markDocumentCompleted();
            } else {
              setIsDoneVisible(false);
              setCurrentIndex(idx, anchorMode);
            }
          }
        }
      },
      { root: feed, threshold: 0.6 }
    );

    feed.querySelectorAll('.card-slide').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [cards, anchorMode, setCurrentIndex, markDocumentCompleted]);

  useEffect(() => {
    if (!timerEndsAt) {
      setTimerLabel('');
      return;
    }

    const tick = () => {
      const remainingMs = timerEndsAt - Date.now();
      if (remainingMs <= 0) {
        void completeFocusTimer();
        setTimerLabel('');
        showToast(toasts().timerDone);
        return;
      }
      const mins = Math.max(1, Math.ceil(remainingMs / 60000));
      setTimerLabel(currentI18n().format(currentI18n().m.common.minutesApprox, { minutes: mins }));
    };

    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [timerEndsAt, completeFocusTimer, showToast]);

  const handleToggleBrownNoise = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        const started = startBrownNoise();
        setBrownNoiseOn(started);
        if (started) showToast(toasts().noiseOn);
      } else {
        stopBrownNoise();
        setBrownNoiseOn(false);
        showToast(toasts().noiseOff);
      }
    },
    [showToast]
  );

  const handleToggleZen = useCallback(() => {
    setShowScrubber(false);
    setZenMode((prev) => {
      const next = !prev;
      if (next) {
        void recordZenModeUsed();
        showToast(toasts().zenOn);
      }
      return next;
    });
  }, [recordZenModeUsed, showToast]);

  const handleToggleBookmark = useCallback(async () => {
    const added = await toggleBookmarkAtCurrent();
    showToast(added ? toasts().bookmarkAdded : toasts().bookmarkRemoved);
  }, [toggleBookmarkAtCurrent, showToast]);

  const handleToggleSpeech = useCallback(() => {
    if (!ttsAvailable) return;
    if (isSpeaking) {
      pendingAutoSpeakRef.current = false;
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    startSpeakingIndex(currentIndex);
  }, [ttsAvailable, isSpeaking, currentIndex, startSpeakingIndex]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sheet !== 'none') {
          setSheet('none');
        } else if (zenMode) {
          setZenMode(false);
        } else if (showScrubber) {
          setShowScrubber(false);
        } else {
          stopBrownNoise();
          void closeReader();
        }
        return;
      }

      if (sheet !== 'none') return;

      if (e.code === 'Space' && !e.shiftKey) {
        e.preventDefault();
        advanceStep();
      } else if (e.code === 'Space' && e.shiftKey) {
        e.preventDefault();
        retreatStep();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        advanceStep();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        retreatStep();
      } else {
        const toggle = readerToggleFor(e);
        if (!toggle) return;
        e.preventDefault();
        if (toggle === 'anchor') {
          updateSettings({ anchorMode: !anchorMode });
        } else if (toggle === 'sentenceFocus') {
          updateSettings({ sentenceFocus: !sentenceFocus });
          showToast(!sentenceFocus ? toasts().focusOn : toasts().focusOff);
        } else if (toggle === 'bookmark') {
          void handleToggleBookmark();
        } else if (toggle === 'speech') {
          handleToggleSpeech();
        } else if (toggle === 'zen') {
          handleToggleZen();
        } else if (toggle === 'thoughts') {
          setShowScrubber(false);
          setSheet('thoughts');
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    sheet,
    zenMode,
    showScrubber,
    anchorMode,
    sentenceFocus,
    closeReader,
    advanceStep,
    retreatStep,
    updateSettings,
    showToast,
    handleToggleBookmark,
    handleToggleSpeech,
    handleToggleZen
  ]);

  if (!activeDoc) return null;

  const total = cards.length;
  const currentCard = cards[currentIndex];
  const remainingMins = isDoneVisible
    ? 0
    : estimateRemainingMinutes(cards, currentIndex);

  const progressPercent = isDoneVisible
    ? 100
    : Math.round(((currentIndex + 1) / Math.max(1, total)) * 100);

  const bookmarkOffsets = activeDoc.bookmarkOffsets ?? [];
  const isCurrentBookmarked = Boolean(
    currentCard &&
      bookmarkOffsets.some(
        (offset) =>
          offset >= currentCard.startOffset && offset < currentCard.endOffset
      )
  );

  const handleCardLengthChange = (preset: CardLengthPreset) => {
    updateSettings({ cardLength: preset });
    const nextIdx = recalculateCards(preset);
    requestAnimationFrame(() => scrollToCard(nextIdx, 'instant'));
  };

  const handleTimerSelect = (minutes: number) => {
    setFocusTimer(minutes);
    if (minutes > 0) {
      showToast(currentI18n().format(toasts().timerOn, { minutes }));
    }
  };

  return (
    <section
      className={`view view-reader ${zenMode ? 'is-zen' : ''}`}
      aria-label={t.mainLabel}
    >
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        onClick={() => {
          setZenMode(false);
          setShowScrubber((v) => !v);
        }}
        title={t.progressHint}
      >
        <div
          className="progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <header className="reader-header">
        <button
          className="icon-btn icon-btn-text"
          type="button"
          aria-label={t.library}
          title={t.back}
          onClick={() => {
            stopBrownNoise();
            void closeReader();
          }}
        >
          <ChevronLeft size={20} />
          <span className="reader-back-label">{t.library}</span>
        </button>

        <div className="reader-center">
          <button
            type="button"
            className="counter-btn"
            aria-expanded={showScrubber}
            title={t.counterHint}
            onClick={() => setShowScrubber((v) => !v)}
          >
            <span>
              {isDoneVisible ? t.done : `${currentIndex + 1} / ${total}`}
            </span>
            {!isDoneVisible && remainingMins > 0 && (
              <span className="counter-eta">
                ·{' '}
                {i18n.format(i18n.m.common.minutesApprox, { minutes: remainingMins })}
              </span>
            )}
          </button>
          {microGoalTarget && !microGoalCompleted && (
            <span className="timer-pill" title={t.goalHint}>
              {i18n.format(t.goal, { count: microGoalCount, target: microGoalTarget })}
            </span>
          )}
          {timerLabel && (
            <span className="timer-pill" title={t.timerHint}>
              {timerLabel}
            </span>
          )}
        </div>

        <div className="reader-header-right">
          <button
            className="icon-btn"
            type="button"
            aria-label={t.parkThought}
            title={t.parkThoughtHint}
            onClick={() => {
              setShowScrubber(false);
              setSheet('thoughts');
            }}
          >
            <Lightbulb size={17} />
          </button>

          {ttsAvailable && (
            <button
              className="icon-btn reader-secondary"
              type="button"
              aria-pressed={isSpeaking}
              aria-label={isSpeaking ? t.stopSpeech : t.speak}
              title={t.speakHint}
              onClick={handleToggleSpeech}
            >
              {isSpeaking ? <Square size={15} /> : <Volume2 size={17} />}
            </button>
          )}

          <button
            className="icon-btn"
            type="button"
            aria-pressed={isCurrentBookmarked}
            aria-label={
              isCurrentBookmarked ? t.bookmarkRemove : t.bookmarkAdd
            }
            title={t.bookmarkHint}
            onClick={() => void handleToggleBookmark()}
          >
            <Bookmark
              size={17}
              fill={isCurrentBookmarked ? 'currentColor' : 'none'}
            />
          </button>

          {bookmarkOffsets.length > 0 && (
            <button
              className="icon-btn icon-btn-badge reader-secondary"
              type="button"
              aria-label={`${t.bookmarksList}, ${bookmarkOffsets.length}`}
              title={t.bookmarksListHint}
              onClick={() => {
                setShowScrubber(false);
                setSheet('bookmarks');
              }}
            >
              {bookmarkOffsets.length}
            </button>
          )}

          <button
            className="icon-btn reader-secondary"
            type="button"
            aria-pressed={anchorMode}
            aria-label={`${t.anchorButton.bold}${t.anchorButton.rest} · ${t.anchor}`}
            title={t.anchorHint}
            onClick={() => updateSettings({ anchorMode: !anchorMode })}
          >
            <span className="anchor-icon-glyph">
              <strong>{t.anchorButton.bold}</strong>
              {t.anchorButton.rest}
            </span>
          </button>

          <button
            className="icon-btn reader-secondary"
            type="button"
            aria-pressed={zenMode}
            aria-label={t.zen}
            title={t.zenHint}
            onClick={handleToggleZen}
          >
            <EyeOff size={16} />
          </button>

          <button
            className="icon-btn reader-secondary"
            type="button"
            aria-label={t.settings}
            title={t.settingsHint}
            onClick={() => {
              setShowScrubber(false);
              setSheet('settings');
            }}
          >
            <SlidersHorizontal size={17} />
          </button>

          <button
            className="icon-btn reader-more"
            type="button"
            aria-label={t.tools.more}
            aria-haspopup="dialog"
            onClick={() => {
              setShowScrubber(false);
              setSheet('tools');
            }}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      {showScrubber && !zenMode && total > 1 && (
        <div className="scrubber-bar" aria-label={t.scrubberLabel}>
          <div className="scrubber-meta">
            <span>{t.scrubberTitle}</span>
            <span>
              {i18n.format(t.cardOf, {
                current: i18n.number(currentIndex + 1),
                total: i18n.number(total)
              })}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={total - 1}
            step={1}
            value={currentIndex}
            onChange={(e) => scrollToCard(Number(e.target.value), 'instant')}
          />
        </div>
      )}

      <div
        ref={feedRef}
        className={`cards-feed ${anchorMode ? 'anchor-active' : ''}`}
        tabIndex={0}
        aria-label={t.cardsLabel}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button')) return;
          if (zenMode) {
            setZenMode(false);
            return;
          }
          if (sentenceFocus && !isDoneVisible) {
            advanceStep();
          }
        }}
      >
        {cards.map((card, idx) => (
          <CardSlide
            key={`${card.index}-${card.startOffset}`}
            card={card}
            previousSnippet={
              idx > 0 ? getPreviousTailSnippet(cards[idx - 1]?.text) : undefined
            }
            total={total}
            anchorMode={anchorMode}
            sentenceFocus={sentenceFocus}
            isActiveCard={card.index === currentIndex}
            activeSentenceIndex={activeSentenceIndex}
            isWithinWindow={
              Math.abs(card.index - currentIndex) <= RENDER_WINDOW_RADIUS
            }
          />
        ))}
        <DoneSlide
          total={total}
          onRestart={() => scrollToCard(0)}
          onBackToLibrary={() => {
            stopBrownNoise();
            void closeReader();
          }}
        />
      </div>

      {toast && (
        <div
          className={`reader-toast ${toast.isAchievement ? 'is-achievement' : ''}`}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      )}

      <div className="desktop-nav" aria-label={t.navLabel}>
        <button
          className="nav-pill"
          type="button"
          aria-label={t.prev}
          title={t.prevHint}
          onClick={retreatStep}
        >
          <ChevronUp size={18} />
        </button>
        <button
          className="nav-pill"
          type="button"
          aria-label={t.next}
          title={t.nextHint}
          onClick={advanceStep}
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {sheet !== 'none' && (
        <div
          className="sheet-backdrop"
          onClick={() => setSheet('none')}
          aria-hidden="true"
        />
      )}

      {sheet === 'settings' && (
        <SettingsSheet
          brownNoiseOn={brownNoiseOn}
          onToggleBrownNoise={handleToggleBrownNoise}
          onCardLengthChange={handleCardLengthChange}
          onTimerSelect={handleTimerSelect}
          onPresetApplied={(label) =>
            showToast(currentI18n().format(toasts().presetOn, { label }))
          }
          onClose={() => setSheet('none')}
        />
      )}

      {sheet === 'bookmarks' && (
        <BookmarksSheet
          docTitle={activeDoc.title}
          cards={cards}
          bookmarkOffsets={bookmarkOffsets}
          bookmarkNotes={activeDoc.bookmarkNotes || {}}
          onSaveNote={(offset, note) => void setBookmarkNote(offset, note)}
          onSelectCard={(idx) => {
            setSheet('none');
            scrollToCard(idx);
          }}
          onClose={() => setSheet('none')}
        />
      )}

      {sheet === 'tools' && (
        <ReaderToolsSheet
          ttsAvailable={ttsAvailable}
          isSpeaking={isSpeaking}
          anchorMode={anchorMode}
          sentenceFocus={sentenceFocus}
          bookmarksCount={bookmarkOffsets.length}
          onSpeak={() => {
            setSheet('none');
            handleToggleSpeech();
          }}
          onAnchor={() => {
            setSheet('none');
            updateSettings({ anchorMode: !anchorMode });
          }}
          onSentenceFocus={() => {
            setSheet('none');
            updateSettings({ sentenceFocus: !sentenceFocus });
            showToast(!sentenceFocus ? toasts().focusOn : toasts().focusOff);
          }}
          onZen={() => {
            setSheet('none');
            handleToggleZen();
          }}
          onBookmarks={() => setSheet('bookmarks')}
          onSettings={() => setSheet('settings')}
          onClose={() => setSheet('none')}
        />
      )}

      {sheet === 'thoughts' && (
        <ThoughtsSheet
          currentDocTitle={activeDoc.title}
          onClose={() => setSheet('none')}
        />
      )}
    </section>
  );
}
