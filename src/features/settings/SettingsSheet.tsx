import { X } from 'lucide-react';
import type {
  CardLengthPreset,
  FontFamilyPreset,
  LetterSpacingPreset,
  ThemeMode
} from '../../core/models/types';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';

interface SettingsSheetProps {
  onCardLengthChange: (preset: CardLengthPreset) => void;
  onTimerSelect: (minutes: number) => void;
  onClose: () => void;
}

const THEMES: Array<{ value: ThemeMode; label: string }> = [
  { value: 'dark', label: 'Темна' },
  { value: 'paper', label: 'Папір' },
  { value: 'gray', label: 'Сіра' },
  { value: 'mint', label: 'М’ята' }
];

const FONTS: Array<{ value: FontFamilyPreset; label: string }> = [
  { value: 'sans', label: 'Звичайний' },
  { value: 'hyperlegible', label: 'Для очей' },
  { value: 'dyslexic', label: 'Дислексія' },
  { value: 'serif', label: 'Книжковий' }
];

const SPACINGS: Array<{ value: LetterSpacingPreset; label: string }> = [
  { value: 'normal', label: 'Звичайний' },
  { value: 'wide', label: 'Ширший' },
  { value: 'extra', label: 'Дислексія' }
];

const LENGTHS: Array<{ value: CardLengthPreset; label: string }> = [
  { value: 'short', label: 'Коротка' },
  { value: 'medium', label: 'Середня' },
  { value: 'long', label: 'Довша' }
];

const TIMERS = [
  { value: 0, label: 'Вимк.' },
  { value: 5, label: '5 хв' },
  { value: 10, label: '10 хв' },
  { value: 15, label: '15 хв' }
];

export function SettingsSheet({
  onCardLengthChange,
  onTimerSelect,
  onClose
}: SettingsSheetProps) {
  const {
    theme,
    fontFamily,
    letterSpacing,
    fontSize,
    lineHeight,
    anchorMode,
    sentenceFocus,
    cardLength,
    updateSettings
  } = useSettingsStore();
  const timerMinutes = useReaderStore((s) => s.timerMinutes);

  return (
    <aside
      className="bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-header">
        <h2 id="settings-title">Комфорт читання</h2>
        <button
          className="icon-btn"
          type="button"
          aria-label="Закрити налаштування"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="sheet-body">
        <div className="setting-row-toggle">
          <div>
            <label htmlFor="toggle-anchor" className="setting-label">
              Режим «Якір»
            </label>
            <p className="setting-hint">
              Виділяє початок слів для легкої фіксації погляду
            </p>
          </div>
          <label className="switch">
            <input
              id="toggle-anchor"
              type="checkbox"
              checked={anchorMode}
              onChange={(e) => updateSettings({ anchorMode: e.target.checked })}
            />
            <span className="switch-slider" />
          </label>
        </div>

        <div className="setting-row-toggle">
          <div>
            <label htmlFor="toggle-sentence-focus" className="setting-label">
              Фокус-речення
            </label>
            <p className="setting-hint">
              Підсвічує одне речення за раз — погляд не перестрибує (клавіша F)
            </p>
          </div>
          <label className="switch">
            <input
              id="toggle-sentence-focus"
              type="checkbox"
              checked={sentenceFocus}
              onChange={(e) =>
                updateSettings({ sentenceFocus: e.target.checked })
              }
            />
            <span className="switch-slider" />
          </label>
        </div>

        <div className="setting-group">
          <span className="setting-label">Шрифт</span>
          <div
            className="segmented segmented-4"
            role="radiogroup"
            aria-label="Вибір шрифту"
          >
            {FONTS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`seg-btn ${fontFamily === item.value ? 'is-active' : ''}`}
                onClick={() => updateSettings({ fontFamily: item.value })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <span className="setting-label">Інтервал літер і слів</span>
          <div
            className="segmented"
            role="radiogroup"
            aria-label="Інтервал літер і слів"
          >
            {SPACINGS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`seg-btn ${letterSpacing === item.value ? 'is-active' : ''}`}
                onClick={() => updateSettings({ letterSpacing: item.value })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <span className="setting-label">Тема</span>
          <div
            className="segmented segmented-4"
            role="radiogroup"
            aria-label="Вибір теми"
          >
            {THEMES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`seg-btn ${theme === item.value ? 'is-active' : ''}`}
                onClick={() => updateSettings({ theme: item.value })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <span className="setting-label">Довжина картки</span>
          <div
            className="segmented"
            role="radiogroup"
            aria-label="Довжина картки"
          >
            {LENGTHS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`seg-btn ${cardLength === item.value ? 'is-active' : ''}`}
                onClick={() => onCardLengthChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label-row">
            <span className="setting-label">Таймер фокусу</span>
            <span className="setting-hint-inline">без секунд і тиску</span>
          </div>
          <div
            className="segmented segmented-4"
            role="radiogroup"
            aria-label="Таймер фокусу"
          >
            {TIMERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`seg-btn ${timerMinutes === item.value ? 'is-active' : ''}`}
                onClick={() => onTimerSelect(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label-row">
            <label htmlFor="range-font-size" className="setting-label">
              Розмір шрифту
            </label>
            <span className="setting-value">{fontSize} px</span>
          </div>
          <input
            id="range-font-size"
            type="range"
            min={18}
            max={34}
            step={1}
            value={fontSize}
            onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
          />
        </div>

        <div className="setting-group">
          <div className="setting-label-row">
            <label htmlFor="range-line-height" className="setting-label">
              Міжрядковий інтервал
            </label>
            <span className="setting-value">{lineHeight.toFixed(2)}</span>
          </div>
          <input
            id="range-line-height"
            type="range"
            min={1.4}
            max={2.2}
            step={0.05}
            value={lineHeight}
            onChange={(e) =>
              updateSettings({ lineHeight: Number(e.target.value) })
            }
          />
        </div>

        <p className="shortcuts-hint">
          Клавіатура: <kbd>Space</kbd>/<kbd>↓</kbd> далі · <kbd>A</kbd> якір ·{' '}
          <kbd>F</kbd> фокус · <kbd>B</kbd> закладка · <kbd>S</kbd> озвучка ·{' '}
          <kbd>Z</kbd> чистий екран
        </p>
      </div>
    </aside>
  );
}
