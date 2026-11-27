import type {
  ColumnWidthPreset,
  FontFamilyPreset,
  LetterSpacingPreset,
  ThemeMode
} from '../../../core/models/types';
import { useI18n } from '../../../i18n';
import { useSettingsStore } from '../../../store/useSettingsStore';

const THEME_VALUES: ThemeMode[] = ['dark', 'paper', 'gray', 'mint'];
const FONT_VALUES: FontFamilyPreset[] = ['sans', 'hyperlegible', 'dyslexic', 'serif'];
const SPACING_VALUES: LetterSpacingPreset[] = ['normal', 'wide', 'extra'];
const WIDTH_VALUES: ColumnWidthPreset[] = ['narrow', 'standard'];

/** Вигляд: theme, font, text size, line height, spacing, column width. */
export function AppearanceSection() {
  const t = useI18n().m.settings;
  const THEMES = THEME_VALUES.map((value) => ({ value, label: t.themes[value] }));
  const FONTS = FONT_VALUES.map((value) => ({ value, label: t.fonts[value] }));
  const SPACINGS = SPACING_VALUES.map((value) => ({ value, label: t.spacings[value] }));
  const WIDTHS = WIDTH_VALUES.map((value) => ({ value, label: t.widths[value] }));
  const { theme, fontFamily, letterSpacing, columnWidth, fontSize, lineHeight, updateSettings } =
    useSettingsStore();

  return (
    <>
      <div className="setting-group">
        <span className="setting-label">{t.theme}</span>
        <div
          className="segmented segmented-4"
          role="radiogroup"
          aria-label={t.themeChoice}
        >
          {THEMES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={theme === item.value}
              className={`seg-btn ${theme === item.value ? 'is-active' : ''}`}
              onClick={() => updateSettings({ theme: item.value })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-group">
        <span className="setting-label">{t.font}</span>
        <div
          className="segmented segmented-4 segmented-wrap"
          role="radiogroup"
          aria-label={t.fontChoice}
        >
          {FONTS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={fontFamily === item.value}
              className={`seg-btn ${fontFamily === item.value ? 'is-active' : ''}`}
              onClick={() => updateSettings({ fontFamily: item.value })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-group">
        <div className="setting-label-row">
          <label htmlFor="range-font-size" className="setting-label">
            {t.fontSize}
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
            {t.lineHeight}
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

      <div className="setting-group">
        <span className="setting-label">{t.spacing}</span>
        <div
          className="segmented"
          role="radiogroup"
          aria-label={t.spacing}
        >
          {SPACINGS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={letterSpacing === item.value}
              className={`seg-btn ${letterSpacing === item.value ? 'is-active' : ''}`}
              onClick={() => updateSettings({ letterSpacing: item.value })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-group">
        <span className="setting-label">{t.width}</span>
        <div
          className="segmented segmented-2"
          role="radiogroup"
          aria-label={t.width}
        >
          {WIDTHS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={columnWidth === item.value}
              className={`seg-btn ${columnWidth === item.value ? 'is-active' : ''}`}
              onClick={() => updateSettings({ columnWidth: item.value })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
