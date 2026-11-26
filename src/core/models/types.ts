export type ThemeMode = 'dark' | 'paper' | 'gray' | 'mint';
export type CardLengthPreset = 'short' | 'medium' | 'long';
export type FontFamilyPreset = 'sans' | 'hyperlegible' | 'dyslexic' | 'serif';
export type LetterSpacingPreset = 'normal' | 'wide' | 'extra';
export type ColumnWidthPreset = 'narrow' | 'standard';
export type TtsRatePreset = 0.75 | 1 | 1.25 | 1.5;

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
  ttsRate: TtsRatePreset;
  ttsAutoAdvance: boolean;
  cardLength: CardLengthPreset;
}

export interface ReadingCard {
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
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
  createdAt: number;
  updatedAt: number;
}

export interface ThoughtNote {
  id: string;
  text: string;
  docTitle?: string;
  createdAt: number;
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
  unlockedIds: string[];
  unlockedAt: Record<string, number>;
  updatedAt: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  getProgress: (stats: UserProgressStats) => number;
}

export interface PlynBackupPayload {
  schemaVersion: 1;
  exportedAt: number;
  documents: PlynDocument[];
  stats: UserProgressStats | null;
}

export type AnchorToken =
  | { type: 'word'; lead: string; rest: string }
  | { type: 'text'; value: string };
