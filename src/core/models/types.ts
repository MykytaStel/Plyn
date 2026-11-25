export type ThemeMode = 'dark' | 'paper' | 'gray';
export type CardLengthPreset = 'short' | 'medium' | 'long';

export interface UserSettings {
  theme: ThemeMode;
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
  createdAt: number;
  updatedAt: number;
}

export type AnchorToken =
  | { type: 'word'; lead: string; rest: string }
  | { type: 'text'; value: string };
