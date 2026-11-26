export type ThemeMode = 'dark' | 'paper' | 'gray' | 'mint';
export type CardLengthPreset = 'short' | 'medium' | 'long';
export type FontFamilyPreset = 'sans' | 'hyperlegible' | 'dyslexic' | 'serif';
export type LetterSpacingPreset = 'normal' | 'wide' | 'extra';

export interface UserSettings {
  theme: ThemeMode;
  fontFamily: FontFamilyPreset;
  letterSpacing: LetterSpacingPreset;
  fontSize: number;
  lineHeight: number;
  anchorMode: boolean;
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
  /** Чи був документ уже дочитаний хоча б раз (для ачівментів без дублювання) */
  completedOnce?: boolean;
  createdAt: number;
  updatedAt: number;
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
