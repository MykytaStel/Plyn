import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  EyeOff,
  Lightbulb,
  ListTree,
  MoreHorizontal,
  SlidersHorizontal,
  Square,
  Volume2
} from 'lucide-react';
import type { CardLengthPreset } from '../../core/models/types';
import {
  chapterEndFromStarts,
  chapterStartIndices,
  cumulativeWords,
  minutesForWordsAt,
  toTimeLeft
} from '../../core/reading/timeLeft';
import {
  isBrownNoisePlaying,
  startBrownNoise,
  stopBrownNoise
} from '../../services/audio/brownNoise';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SettingsSheet } from '../settings/SettingsSheet';
import { ThoughtsSheet } from '../thoughts/ThoughtsSheet';
import { BookmarksSheet } from './BookmarksSheet';
import { ReaderToolsSheet } from './ReaderToolsSheet';
import { currentI18n, useI18n } from '../../i18n';
import type { ReaderToggle } from './shortcuts';
import { CardSlide } from './CardSlide';
import { DoneSlide } from './DoneSlide';
import { useCardNavigation } from './hooks/useCardNavigation';
import { feedWindow as getFeedWindow } from '../../core/reading/feedWindow';
import { useFocusTimer } from './hooks/useFocusTimer';
import { useReaderKeyboard } from './hooks/useReaderKeyboard';
import { useReaderNotices } from './hooks/useReaderNotices';
import { useReaderToast } from './hooks/useReaderToast';
import { useSpeech } from './hooks/useSpeech';
import { useReadingPace } from './hooks/useReadingPace';
import { useKeepScreenOn } from './hooks/useKeepScreenOn';
import { useBackLayer } from '../shared/useBackLayer';

type ActiveSheet = 'none' | 'settings' | 'bookmarks' | 'thoughts' | 'tools';

function getPreviousTailSnippet(prevText?: string): string | undefined {
  if (!prevText) return undefined;
  const trimmed = prevText.trim();
  if (trimmed.length <= 72) return trimmed;
  const slice = trimmed.slice(-72);
  const firstSpace = slice.indexOf(' ');
  return (firstSpace > 0 ? slice.slice(firstSpace + 1) : slice).trim();
}

/** Composition of the reader: state lives in the hooks under ./hooks (IMP-08). */
export function ReaderView() {
  const i18n = useI18n();
  const t = i18n.m.reader;
  /** Handlers read copy at call time, so a language switch applies immediately. */
  const toasts = () => currentI18n().m.reader.toasts;
  const activeDoc = useReaderStore((s) => s.activeDoc);
  const cards = useReaderStore((s) => s.cards);
  const currentIndex = useReaderStore((s) => s.currentIndex);
  const microGoalTarget = useReaderStore((s) => s.microGoalTarget);
  const microGoalCount = useReaderStore((s) => s.microGoalCount);
  const microGoalCompleted = useReaderStore((s) => s.microGoalCompleted);
  const closeReader = useReaderStore((s) => s.closeReader);
  const recalculateCards = useReaderStore((s) => s.recalculateCards);
  const toggleBookmarkAtCurrent = useReaderStore((s) => s.toggleBookmarkAtCurrent);
  const setBookmarkNote = useReaderStore((s) => s.setBookmarkNote);
  const setFocusTimer = useReaderStore((s) => s.setFocusTimer);
  const recordZenModeUsed = useReaderStore((s) => s.recordZenModeUsed);

  const anchorMode = useSettingsStore((s) => s.anchorMode);
  const sentenceFocus = useSettingsStore((s) => s.sentenceFocus);
  const showTimeLeft = useSettingsStore((s) => s.showTimeLeft);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [sheet, setSheet] = useState<ActiveSheet>('none');
  const [showScrubber, setShowScrubber] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [brownNoiseOn, setBrownNoiseOn] = useState(() => isBrownNoisePlaying());
  const feedRef = useRef<HTMLDivElement>(null);

  const { toast, showToast } = useReaderToast();
  useReaderNotices(showToast);
  const timerLabel = useFocusTimer(showToast);
  const leaveZen = useCallback(() => setZenMode(false), []);
  const { isDoneVisible, activeSentenceIndex, scrollToCard, advanceStep, retreatStep } =
    useCardNavigation({ feedRef, sentenceFocus, anchorMode, onReachDone: leaveZen });
  const {
    ttsAvailable,
    isSpeaking,
    toggleSpeech: handleToggleSpeech,
    spokenRange
  } = useSpeech({ scrollToCard, chapters: activeDoc?.chapters, showToast });
  useKeepScreenOn(isSpeaking);
  const wpm = useReadingPace({ cards, currentIndex, isSpeaking });
  const docChapters = activeDoc?.chapters;
  // Per-document work, so a card change does not redo O(n) (0.27).
  const wordPrefix = useMemo(() => cumulativeWords(cards), [cards]);
  const chapterStarts = useMemo(
    () => chapterStartIndices(cards, docChapters ?? []),
    [cards, docChapters]
  );

  const leaveReader = useCallback(() => {
    stopBrownNoise();
    void closeReader();
  }, [closeReader]);

  // Back closes an open sheet first, then returns to the library (0.22).
  useBackLayer(true, leaveReader);
  useBackLayer(sheet !== 'none', () => setSheet('none'));

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

  const toggleSentenceFocus = () => {
    updateSettings({ sentenceFocus: !sentenceFocus });
    showToast(!sentenceFocus ? toasts().focusOn : toasts().focusOff);
  };

  const openSheet = (next: Exclude<ActiveSheet, 'none'>) => {
    setShowScrubber(false);
    setSheet(next);
  };

  useReaderKeyboard({
    sheetOpen: sheet !== 'none',
    onEscape: () => {
      if (sheet !== 'none') setSheet('none');
      else if (zenMode) setZenMode(false);
      else if (showScrubber) setShowScrubber(false);
      else leaveReader();
    },
    onNext: advanceStep,
    onPrev: retreatStep,
    onToggle: (toggle: ReaderToggle) => {
      if (toggle === 'anchor') updateSettings({ anchorMode: !anchorMode });
      else if (toggle === 'sentenceFocus') toggleSentenceFocus();
      else if (toggle === 'bookmark') void handleToggleBookmark();
      else if (toggle === 'speech') handleToggleSpeech();
      else if (toggle === 'zen') handleToggleZen();
      else if (toggle === 'thoughts') openSheet('thoughts');
    }
  });

  if (!activeDoc) return null;

  const total = cards.length;
  // Only the cards near the current one are in the DOM (0.25).
  const feedWindow = getFeedWindow(currentIndex, total);
  const currentCard = cards[currentIndex];
  const endIndex = chapterEndFromStarts(chapterStarts, total, currentIndex);
  const timeLeft =
    showTimeLeft && !isDoneVisible && currentIndex < total
      ? toTimeLeft(
          minutesForWordsAt(wordPrefix[endIndex] - wordPrefix[currentIndex], wpm)
        )
      : null;
  const timeLeftText = timeLeft
    ? i18n.format(t.timeLeft[timeLeft.unit], { n: timeLeft.value })
    : '';
  const plainTime = timeLeft
    ? i18n.format(t.timeLeft[timeLeft.unit === 'min' ? 'minPlain' : 'hourPlain'], {
        n: timeLeft.value
      })
    : '';
  const counterLabel = timeLeft
    ? `${currentIndex + 1} / ${total}. ${i18n.format(
        endIndex < total ? t.timeLeft.toChapterEnd : t.timeLeft.toTextEnd,
        { time: plainTime }
      )}`
    : undefined;

  const progressPercent = isDoneVisible
    ? 100
    : Math.round(((currentIndex + 1) / Math.max(1, total)) * 100);

  const bookmarkOffsets = activeDoc.bookmarkOffsets ?? [];
  const chapters = activeDoc.chapters ?? [];
  const hasContents = chapters.length > 0;
  const isCurrentBookmarked = Boolean(
    currentCard &&
      bookmarkOffsets.some(
        (offset) =>
          offset >= currentCard.startOffset && offset < currentCard.endOffset
      )
  );

  const handleCardLengthChange = (preset: CardLengthPreset) => {
    updateSettings({ cardLength: preset });
    void recalculateCards(preset).then((nextIdx) =>
      requestAnimationFrame(() => scrollToCard(nextIdx, 'instant'))
    );
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
          onClick={leaveReader}
        >
          <ChevronLeft size={20} />
          <span className="reader-back-label">{t.library}</span>
        </button>

        <div className="reader-center">
          <button
            type="button"
            className="counter-btn"
            aria-expanded={showScrubber}
            aria-label={counterLabel}
            title={t.counterHint}
            onClick={() => setShowScrubber((v) => !v)}
          >
            <span>
              {isDoneVisible ? t.done : `${currentIndex + 1} / ${total}`}
            </span>
            {timeLeft && <span className="counter-eta">· {timeLeftText}</span>}
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
            onClick={() => openSheet('thoughts')}
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

          {(bookmarkOffsets.length > 0 || hasContents) && (
            <button
              className="icon-btn icon-btn-badge reader-secondary"
              type="button"
              aria-label={
                hasContents
                  ? bookmarkOffsets.length > 0
                    ? `${t.contentsList}, ${bookmarkOffsets.length}`
                    : t.contentsList
                  : `${t.bookmarksList}, ${bookmarkOffsets.length}`
              }
              title={hasContents ? t.contentsList : t.bookmarksListHint}
              onClick={() => {
                setShowScrubber(false);
                setSheet('bookmarks');
              }}
            >
              {bookmarkOffsets.length > 0 ? bookmarkOffsets.length : <ListTree size={17} />}
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
            onClick={() => openSheet('settings')}
          >
            <SlidersHorizontal size={17} />
          </button>

          <button
            className="icon-btn reader-more"
            type="button"
            aria-label={t.tools.more}
            aria-haspopup="dialog"
            onClick={() => openSheet('tools')}
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
        {feedWindow.start > 0 && (
          <div
            className="feed-spacer"
            aria-hidden="true"
            style={{ '--slides': feedWindow.start } as CSSProperties}
          />
        )}
        {cards.slice(feedWindow.start, feedWindow.end + 1).map((card) => {
          const idx = card.index;
          const isActiveCard = idx === currentIndex;
          return (
            <CardSlide
              key={idx}
              card={card}
              previousSnippet={
                idx > 0 ? getPreviousTailSnippet(cards[idx - 1]?.text) : undefined
              }
              total={total}
              anchorMode={anchorMode}
              sentenceFocus={sentenceFocus}
              isActiveCard={isActiveCard}
              activeSentenceIndex={isActiveCard ? activeSentenceIndex : 0}
              spokenRange={
                isActiveCard && spokenRange?.cardIndex === idx ? spokenRange : null
              }
            />
          );
        })}
        {feedWindow.end < total - 1 && (
          <div
            className="feed-spacer"
            aria-hidden="true"
            style={{ '--slides': total - 1 - feedWindow.end } as CSSProperties}
          />
        )}
        <DoneSlide
          total={total}
          onRestart={() => scrollToCard(0)}
          onBackToLibrary={leaveReader}
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
          chapters={chapters}
          currentOffset={currentCard?.startOffset ?? 0}
          onSelectCard={(idx) => {
            setSheet('none');
            scrollToCard(idx);
            // Keyboard reading goes on from the card, not from the header button.
            requestAnimationFrame(() => feedRef.current?.focus({ preventScroll: true }));
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
          hasContents={hasContents}
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
            toggleSentenceFocus();
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
