import { X } from 'lucide-react';
import type {
  CardLengthPreset,
  ColumnWidthPreset,
  FontFamilyPreset,
  LetterSpacingPreset,
  ThemeMode,
  TtsRatePreset
} from '../../core/models/types';
import { READING_PRESETS } from '../../core/presets/readingPresets';
import { useReaderStore } from '../../store/useReaderStore';
import { APP_VERSION } from '../../appVersion';
import { useI18n } from '../../i18n';
import { LANGUAGE_LABEL, LOCALE_NAMES, LOCALES } from '../../i18n/locales';
import { useSettingsStore } from '../../store/useSettingsStore';
import { StorageSection } from './StorageSection';
import { screenWakeLock } from '../../services/screen/wakeLock';
import { useDialogFocus } from '../shared/useDialogFocus';

/**
 * Reader-only props (brown noise, timer, card re-split) are optional: the
 * library opens the same sheet without a reading session, and those rows hide.
 */
interface SettingsSheetProps {
  brownNoiseOn?: boolean;
  onToggleBrownNoise?: (enabled: boolean) => void;
  onCardLengthChange?: (preset: CardLengthPreset) => void;
  onTimerSelect?: (minutes: number) => void;
  onPresetApplied?: (label: string) => void;
  onClose: () => void;
}

const THEME_VALUES: ThemeMode[] = ['dark', 'paper', 'gray', 'mint'];
const FONT_VALUES: FontFamilyPreset[] = ['sans', 'hyperlegible', 'dyslexic', 'serif'];
const SPACING_VALUES: LetterSpacingPreset[] = ['normal', 'wide', 'extra'];
const WIDTH_VALUES: ColumnWidthPreset[] = ['narrow', 'standard'];
const LENGTH_VALUES: CardLengthPreset[] = ['short', 'medium', 'long'];

const TTS_RATES: Array<{ value: TtsRatePreset; label: string }> = [
  { value: 0.75, label: '0.75×' },
  { value: 1, label: '1×' },
  { value: 1.25, label: '1.25×' },
  { value: 1.5, label: '1.5×' }
];

const TIMER_VALUES = [0, 5, 10, 15];

export function SettingsSheet({
  brownNoiseOn,
  onToggleBrownNoise,
  onCardLengthChange,
  onTimerSelect,
  onPresetApplied,
  onClose
}: SettingsSheetProps) {
  const dialogRef = useDialogFocus<HTMLElement>();
  const i18n = useI18n();
  const t = i18n.m.settings;
  const THEMES = THEME_VALUES.map((value) => ({ value, label: t.themes[value] }));
  const FONTS = FONT_VALUES.map((value) => ({ value, label: t.fonts[value] }));
  const SPACINGS = SPACING_VALUES.map((value) => ({ value, label: t.spacings[value] }));
  const WIDTHS = WIDTH_VALUES.map((value) => ({ value, label: t.widths[value] }));
  const LENGTHS = LENGTH_VALUES.map((value) => ({ value, label: t.lengths[value] }));
  const TIMERS = TIMER_VALUES.map((value) => ({
    value,
    label: value === 0 ? t.timerOff : i18n.format(t.minutesShort, { minutes: value })
  }));
  const {
    theme,
    fontFamily,
    letterSpacing,
    columnWidth,
    fontSize,
    lineHeight,
    anchorMode,
    sentenceFocus,
    eyeBreakReminder,
    keepScreenOn,
    ttsRate,
    ttsAutoAdvance,
    cardLength,
    language,
    updateSettings
  } = useSettingsStore();
  const timerMinutes = useReaderStore((s) => s.timerMinutes);
  const isReader = Boolean(onTimerSelect);
  const wakeLockSupported = screenWakeLock().supported;

  return (
    <aside
      ref={dialogRef}
      className="bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-header">
        <h2 id="settings-title">{t.title}</h2>
        <button
          className="icon-btn"
          type="button"
          aria-label={t.close}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="sheet-body">
        {/* Швидкі пресети в 1 тап */}
        <div className="setting-group">
          <span className="setting-label">{t.presets}</span>
          <div className="presets-grid">
            {READING_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="preset-btn"
                title={i18n.m.presets[preset.id].hint}
                onClick={() => {
                  updateSettings(preset.patch);
                  onPresetApplied?.(i18n.m.presets[preset.id].label);
                }}
              >
                <span className="preset-btn-title">
                  {i18n.m.presets[preset.id].label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <section className="settings-section">
          <h3 className="settings-section-title">{t.sections.appearance}</h3>
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
        </section>

        <section className="settings-section">
          <h3 className="settings-section-title">{t.sections.reading}</h3>
          <div className="setting-row-toggle">
            <div>
              <label htmlFor="toggle-anchor" className="setting-label">
                {t.anchor}
              </label>
              <p className="setting-hint">
                {t.anchorHint}
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
                {t.sentenceFocus}
              </label>
              <p className="setting-hint">
                {t.sentenceFocusHint}
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
            <span className="setting-label">{t.cardLength}</span>
            <div
              className="segmented"
              role="radiogroup"
              aria-label={t.cardLength}
            >
              {LENGTHS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={cardLength === item.value}
                  className={`seg-btn ${cardLength === item.value ? 'is-active' : ''}`}
                  onClick={() =>
                    onCardLengthChange
                      ? onCardLengthChange(item.value)
                      : updateSettings({ cardLength: item.value })
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {isReader && (
            <div className="setting-group">
              <div className="setting-label-row">
                <span className="setting-label">{t.timer}</span>
                <span className="setting-hint-inline">{t.timerHint}</span>
              </div>
              <div
                className="segmented segmented-4"
                role="radiogroup"
                aria-label={t.timer}
              >
                {TIMERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={timerMinutes === item.value}
                    className={`seg-btn ${timerMinutes === item.value ? 'is-active' : ''}`}
                    onClick={() => onTimerSelect?.(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="setting-row-toggle">
            <div>
              <label htmlFor="toggle-eye-break" className="setting-label">
                {t.eyeBreak}
              </label>
              <p className="setting-hint">
                {t.eyeBreakHint}
              </p>
            </div>
            <label className="switch">
              <input
                id="toggle-eye-break"
                type="checkbox"
                checked={eyeBreakReminder}
                onChange={(e) =>
                  updateSettings({ eyeBreakReminder: e.target.checked })
                }
              />
              <span className="switch-slider" />
            </label>
          </div>
          {wakeLockSupported && (
            <div className="setting-row-toggle">
              <div>
                <label htmlFor="toggle-keep-screen-on" className="setting-label">
                  {t.keepScreenOn}
                </label>
                <p className="setting-hint">{t.keepScreenOnHint}</p>
              </div>
              <label className="switch">
                <input
                  id="toggle-keep-screen-on"
                  type="checkbox"
                  checked={keepScreenOn}
                  onChange={(e) => updateSettings({ keepScreenOn: e.target.checked })}
                />
                <span className="switch-slider" />
              </label>
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3 className="settings-section-title">{t.sections.sound}</h3>
          {isReader && (
            <div className="setting-row-toggle">
              <div>
                <label htmlFor="toggle-brown-noise" className="setting-label">
                  {t.brownNoise}
                </label>
                <p className="setting-hint">
                  {t.brownNoiseHint}
                </p>
              </div>
              <label className="switch">
                <input
                  id="toggle-brown-noise"
                  type="checkbox"
                  checked={Boolean(brownNoiseOn)}
                  onChange={(e) => onToggleBrownNoise?.(e.target.checked)}
                />
                <span className="switch-slider" />
              </label>
            </div>
          )}

          <div className="setting-row-toggle">
            <div>
              <label htmlFor="toggle-tts-auto" className="setting-label">
                {t.autoAdvance}
              </label>
              <p className="setting-hint">
                {t.autoAdvanceHint}
              </p>
            </div>
            <label className="switch">
              <input
                id="toggle-tts-auto"
                type="checkbox"
                checked={ttsAutoAdvance}
                onChange={(e) =>
                  updateSettings({ ttsAutoAdvance: e.target.checked })
                }
              />
              <span className="switch-slider" />
            </label>
          </div>

          <div className="setting-group">
            <span className="setting-label">{t.ttsRate}</span>
            <div
              className="segmented segmented-4"
              role="radiogroup"
              aria-label={t.ttsRate}
            >
              {TTS_RATES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={ttsRate === item.value}
                  className={`seg-btn ${ttsRate === item.value ? 'is-active' : ''}`}
                  onClick={() => updateSettings({ ttsRate: item.value })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3 className="settings-section-title">{LANGUAGE_LABEL}</h3>
          <div className="setting-group">
            <div
              className="segmented segmented-2"
              role="radiogroup"
              aria-label={LANGUAGE_LABEL}
            >
              {LOCALES.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  role="radio"
                  lang={locale}
                  className={`seg-btn ${language === locale ? 'is-active' : ''}`}
                  aria-checked={language === locale}
                  onClick={() => updateSettings({ language: locale })}
                >
                  {LOCALE_NAMES[locale]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <StorageSection />

        <p className="shortcuts-hint">
          {t.shortcuts.keyboard} <kbd>Space</kbd>/<kbd>↓</kbd> {t.shortcuts.next} ·{' '}
          <kbd>A</kbd> {t.shortcuts.anchor} · <kbd>F</kbd> {t.shortcuts.focus} ·{' '}
          <kbd>N</kbd> {t.shortcuts.thought} · <kbd>S</kbd> {t.shortcuts.speech} ·{' '}
          <kbd>Z</kbd> {t.shortcuts.zen}
        </p>

        <p className="app-version">{i18n.format(t.version, { version: APP_VERSION })}</p>
      </div>
    </aside>
  );
}
