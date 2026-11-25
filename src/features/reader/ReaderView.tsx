import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  SlidersHorizontal,
  Square,
  Volume2
} from 'lucide-react';
import type { CardLengthPreset } from '../../core/models/types';
import { estimateRemainingMinutes } from '../../core/reading/readingStats';
import {
  isTtsSupported,
  speakCardText,
  stopSpeaking
} from '../../services/speech/tts';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SettingsSheet } from '../settings/SettingsSheet';
import { BookmarksSheet } from './BookmarksSheet';
import { CardSlide } from './CardSlide';
import { DoneSlide } from './DoneSlide';

type ActiveSheet = 'none' | 'settings' | 'bookmarks';
const RENDER_WINDOW_RADIUS = 5;

export function ReaderView() {
  const activeDoc = useReaderStore((s) => s.activeDoc);
  const cards = useReaderStore((s) => s.cards);
  const currentIndex = useReaderStore((s) => s.currentIndex);
  const timerEndsAt = useReaderStore((s) => s.timerEndsAt);
  const recentUnlocks = useReaderStore((s) => s.recentUnlocks);
  const closeReader = useReaderStore((s) => s.closeReader);
  const setCurrentIndex = useReaderStore((s) => s.setCurrentIndex);
  const markDocumentCompleted = useReaderStore((s) => s.markDocumentCompleted);
  const recalculateCards = useReaderStore((s) => s.recalculateCards);
  const toggleBookmarkAtCurrent = useReaderStore(
    (s) => s.toggleBookmarkAtCurrent
  );
  const setFocusTimer = useReaderStore((s) => s.setFocusTimer);
  const completeFocusTimer = useReaderStore((s) => s.completeFocusTimer);
  const shiftRecentUnlock = useReaderStore((s) => s.shiftRecentUnlock);

  const anchorMode = useSettingsStore((s) => s.anchorMode);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [sheet, setSheet] = useState<ActiveSheet>('none');
  const [showScrubber, setShowScrubber] = useState(false);
  const [isDoneVisible, setIsDoneVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toast, setToast] = useState<{ text: string; isAchievement?: boolean } | null>(null);
  const [timerLabel, setTimerLabel] = useState('');

  const feedRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const ttsAvailable = useMemo(() => isTtsSupported(), []);

  const showToast = useCallback((text: string, isAchievement = false) => {
    setToast({ text, isAchievement });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(
      () => setToast(null),
      isAchievement ? 3800 : 2600
    );
  }, []);

  // Показуємо спокійний тост при відкритті нової нагороди
  useEffect(() => {
    if (recentUnlocks.length === 0) return;
    const next = recentUnlocks[0];
    showToast(`Нова нагорода: «${next.title}»`, true);
    shiftRecentUnlock();
  }, [recentUnlocks, shiftRecentUnlock, showToast]);

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

  // Початковий перехід на збережену позицію
  useEffect(() => {
    if (!activeDoc) return;
    requestAnimationFrame(() => {
      scrollToCard(currentIndex, 'instant');
      feedRef.current?.focus({ preventScroll: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc?.id]);

  // Зупиняємо озвучку при зміні картки
  useEffect(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, [currentIndex]);

  // Відстеження активної картки через IntersectionObserver
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

  // М'який таймер фокусу (без секунд)
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
        showToast('Час фокусу завершено — можеш зробити паузу або читати далі');
        return;
      }
      const mins = Math.max(1, Math.ceil(remainingMs / 60000));
      setTimerLabel(`~${mins} хв`);
    };

    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [timerEndsAt, completeFocusTimer, showToast]);

  const handleToggleBookmark = useCallback(async () => {
    const added = await toggleBookmarkAtCurrent();
    showToast(added ? 'Картку додано в закладки' : 'Закладку прибрано');
  }, [toggleBookmarkAtCurrent, showToast]);

  const handleToggleSpeech = useCallback(() => {
    if (!ttsAvailable) return;
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    const text = cards[currentIndex]?.text;
    if (!text) return;
    speakCardText(text, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false)
    });
  }, [ttsAvailable, isSpeaking, cards, currentIndex]);

  // Клавіатура для MacBook
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sheet !== 'none') {
          setSheet('none');
        } else if (showScrubber) {
          setShowScrubber(false);
        } else {
          void closeReader();
        }
        return;
      }

      if (sheet !== 'none') return;

      if (e.code === 'Space' && !e.shiftKey) {
        e.preventDefault();
        scrollToCard(getVisibleSlideIndex() + 1);
      } else if (e.code === 'Space' && e.shiftKey) {
        e.preventDefault();
        scrollToCard(getVisibleSlideIndex() - 1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        scrollToCard(getVisibleSlideIndex() + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        scrollToCard(getVisibleSlideIndex() - 1);
      } else if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'ф') {
        e.preventDefault();
        updateSettings({ anchorMode: !anchorMode });
      } else if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'и') {
        e.preventDefault();
        void handleToggleBookmark();
      } else if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'і') {
        e.preventDefault();
        handleToggleSpeech();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    sheet,
    showScrubber,
    anchorMode,
    closeReader,
    getVisibleSlideIndex,
    scrollToCard,
    updateSettings,
    handleToggleBookmark,
    handleToggleSpeech
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
      showToast(`М’який таймер на ${minutes} хв увімкнено`);
    }
  };

  return (
    <section className="view view-reader" aria-label="Режим читання">
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        onClick={() => setShowScrubber((v) => !v)}
        title="Натисни для швидкого переходу по картках"
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
          aria-label="Повернутися до бібліотеки"
          onClick={() => void closeReader()}
        >
          <ChevronLeft size={20} />
          <span>Бібліотека</span>
        </button>

        <div className="reader-center">
          <button
            type="button"
            className="counter-btn"
            aria-expanded={showScrubber}
            title="Швидкий перехід по картках"
            onClick={() => setShowScrubber((v) => !v)}
          >
            <span>
              {isDoneVisible ? `Готово` : `${currentIndex + 1} / ${total}`}
            </span>
            {!isDoneVisible && remainingMins > 0 && (
              <span className="counter-eta">· ~{remainingMins} хв</span>
            )}
          </button>
          {timerLabel && (
            <span className="timer-pill" title="М’який таймер фокусу">
              {timerLabel}
            </span>
          )}
        </div>

        <div className="reader-header-right">
          {ttsAvailable && (
            <button
              className="icon-btn"
              type="button"
              aria-pressed={isSpeaking}
              aria-label={isSpeaking ? 'Зупинити озвучку' : 'Озвучити картку'}
              title="Озвучити картку (клавіша S)"
              onClick={handleToggleSpeech}
            >
              {isSpeaking ? <Square size={16} /> : <Volume2 size={18} />}
            </button>
          )}

          <button
            className="icon-btn"
            type="button"
            aria-pressed={isCurrentBookmarked}
            aria-label={
              isCurrentBookmarked ? 'Прибрати закладку' : 'Додати закладку'
            }
            title="Закладка (клавіша B)"
            onClick={() => void handleToggleBookmark()}
          >
            <Bookmark
              size={18}
              fill={isCurrentBookmarked ? 'currentColor' : 'none'}
            />
          </button>

          {bookmarkOffsets.length > 0 && (
            <button
              className="icon-btn icon-btn-badge"
              type="button"
              aria-label="Список закладок"
              title="Усі закладки"
              onClick={() => {
                setShowScrubber(false);
                setSheet('bookmarks');
              }}
            >
              {bookmarkOffsets.length}
            </button>
          )}

          <button
            className="icon-btn"
            type="button"
            aria-pressed={anchorMode}
            aria-label="Режим Якір"
            title="Режим Якір (клавіша A)"
            onClick={() => updateSettings({ anchorMode: !anchorMode })}
          >
            <span className="anchor-icon-glyph">
              <strong>Я</strong>к
            </span>
          </button>

          <button
            className="icon-btn"
            type="button"
            aria-label="Налаштування вигляду"
            title="Налаштування"
            onClick={() => {
              setShowScrubber(false);
              setSheet('settings');
            }}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </header>

      {showScrubber && total > 1 && (
        <div className="scrubber-bar" aria-label="Швидкий перехід по тексту">
          <div className="scrubber-meta">
            <span>Швидкий перехід</span>
            <span>
              Картка {currentIndex + 1} з {total}
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
        aria-label="Картки тексту"
      >
        {cards.map((card) => (
          <CardSlide
            key={`${card.index}-${card.startOffset}`}
            card={card}
            total={total}
            anchorMode={anchorMode}
            isWithinWindow={
              Math.abs(card.index - currentIndex) <= RENDER_WINDOW_RADIUS
            }
          />
        ))}
        <DoneSlide
          total={total}
          onRestart={() => scrollToCard(0)}
          onBackToLibrary={() => void closeReader()}
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

      <div className="desktop-nav" aria-label="Навігація по картках">
        <button
          className="nav-pill"
          type="button"
          aria-label="Попередня картка"
          title="Попередня (↑)"
          onClick={() => scrollToCard(getVisibleSlideIndex() - 1)}
        >
          <ChevronUp size={18} />
        </button>
        <button
          className="nav-pill"
          type="button"
          aria-label="Наступна картка"
          title="Наступна (Space або ↓)"
          onClick={() => scrollToCard(getVisibleSlideIndex() + 1)}
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
          onCardLengthChange={handleCardLengthChange}
          onTimerSelect={handleTimerSelect}
          onClose={() => setSheet('none')}
        />
      )}

      {sheet === 'bookmarks' && (
        <BookmarksSheet
          cards={cards}
          bookmarkOffsets={bookmarkOffsets}
          onSelectCard={(idx) => {
            setSheet('none');
            scrollToCard(idx);
          }}
          onClose={() => setSheet('none')}
        />
      )}
    </section>
  );
}
