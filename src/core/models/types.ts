import type { ContentLanguage } from '../language/detectContentLanguage';

export type ThemeMode = 'dark' | 'paper' | 'gray' | 'mint';
export type CardLengthPreset = 'short' | 'medium' | 'long';
export type FontFamilyPreset = 'sans' | 'hyperlegible' | 'dyslexic' | 'serif';
export type LetterSpacingPreset = 'normal' | 'wide' | 'extra';
export type ColumnWidthPreset = 'narrow' | 'standard';
export type TtsRatePreset = 0.75 | 1 | 1.25 | 1.5;
/** Interface language (content language is detected separately per text). */
export type UiLocale = 'uk' | 'en';

export interface UserSettings {
  theme: ThemeMode;
  fontFamily: FontFamilyPreset;
  letterSpacing: LetterSpacingPreset;
  columnWidth: ColumnWidthPreset;
  fontSize: number;
  lineHeight: number;
  anchorMode: boolean;
  sentenceFocus: boolean;
  eyeBreakReminder: boolean;
  /** Screen Wake Lock while reading or listening (0.22). */
  keepScreenOn: boolean;
  ttsRate: TtsRatePreset;
  ttsAutoAdvance: boolean;
  /** Highlight the word being spoken, where the voice reports positions (0.26). */
  ttsWordHighlight: boolean;
  /** Chosen voice (voiceURI) per content language; missing = browser default (0.26). */
  ttsVoices: Partial<Record<ContentLanguage, string>>;
  cardLength: CardLengthPreset;
  /** Soft syllable breaks inside long words (0.27). */
  syllableHints: boolean;
  /** Show the estimated time left in the reader (0.27). */
  showTimeLeft: boolean;
  language: UiLocale;
}

export interface ReadingCard {
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
}

/** One entry of a book's table of contents. */
export interface DocumentChapter {
  title: string;
  /** Character offset in the normalized text where the chapter starts. */
  offset: number;
  /** Nesting depth: 0 for top-level parts or chapters. */
  level: number;
}

export interface PlynDocument {
  id: string;
  schemaVersion: 1;
  title: string;
  text: string;
  /** Позиція символу в нормалізованому тексті — платформо-незалежний прогрес (Web / iOS / Android) */
  charOffset: number;
  /** Індекс картки для швидкого відображення у списку бібліотеки */
  currentIndex: number;
  totalCards: number;
  /** Закладки збережені як charOffset, щоб не ламалися при зміні довжини картки */
  bookmarkOffsets: number[];
  /** Короткі нотатки до закладок, ключ — string(charOffset) */
  bookmarkNotes?: Record<string, string>;
  /** Чи був документ уже дочитаний хоча б раз (для ачівментів без дублювання) */
  completedOnce?: boolean;
  /** Book author from the file's metadata (EPUB, FB2). Since 0.23. */
  author?: string;
  /**
   * The book's table of contents. Offsets point into the normalized text,
   * like bookmarks, so they survive any card length. Since 0.23.
   */
  chapters?: DocumentChapter[];
  createdAt: number;
  updatedAt: number;
}

/**
 * A document as the library stores it since 0.25 (IMP-06): everything except
 * the text, which lives in its own table, so the library list stays light.
 */
export interface DocumentMeta extends Omit<PlynDocument, 'text'> {
  /** `textHash(text)`, to find a duplicate without reading every text. */
  textHash: string;
  /** Length of the text in characters. */
  textLength: number;
  /** Words in the text, for the reading-time estimate in the library. */
  wordCount: number;
}

/** The text of one document, keyed by the document id (0.25). */
export interface StoredText {
  id: string;
  text: string;
}

export interface ThoughtNote {
  id: string;
  text: string;
  docTitle?: string;
  createdAt: number;
}

/** Learned reading speed: words per minute averaged over `samples` cards (0.27). */
export interface ReadingPace {
  wordsPerMinute: number;
  samples: number;
}

export interface UserProgressStats {
  id: 'main';
  totalCardsRead: number;
  totalDocsCompleted: number;
  anchorCardsRead: number;
  totalBookmarksCreated: number;
  timerSessionsCompleted: number;
  ttsCardsListened: number;
  zenModeUsed: number;
  /** Кількість прочитаних карток по днях (ключ: YYYY-MM-DD) для спокійного 7-денного огляду */
  dailyCardsRead?: Record<string, number>;
  readingPace?: ReadingPace;
  unlockedIds: string[];
  unlockedAt: Record<string, number>;
  updatedAt: number;
}

export type AchievementId =
  | 'first_step'
  | 'rhythm_50'
  | 'anchor_25'
  | 'zen_reader'
  | 'audio_listener'
  | 'thought_hunter'
  | 'no_rush'
  | 'bookworm_3'
  | 'rhythm_250'
  | 'rhythm_1000';

/** Copy (title, description) lives in src/i18n: m.achievements[id]. */
export interface AchievementDefinition {
  id: AchievementId;
  target: number;
  getProgress: (stats: UserProgressStats) => number;
}

/**
 * A library backup file. v1 (up to 0.20): documents and stats.
 * v2 (0.21+): also Thought Parking notes and settings. Both import forever
 * (fixtures in spec/backups/).
 */
export interface PlynBackupPayload {
  schemaVersion: 2;
  exportedAt: number;
  documents: PlynDocument[];
  stats: UserProgressStats | null;
  thoughts: ThoughtNote[];
  /** Null in v1 files; applied on import only if the device has no settings yet. */
  settings: UserSettings | null;
}

export type AnchorToken =
  | { type: 'word'; lead: string; rest: string }
  | { type: 'text'; value: string };
