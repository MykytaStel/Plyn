import type { CardLengthPreset } from '../../../core/models/types';
import { useI18n } from '../../../i18n';
import { screenWakeLock } from '../../../services/screen/wakeLock';
import { useReaderStore } from '../../../store/useReaderStore';
import { useSettingsStore } from '../../../store/useSettingsStore';

const LENGTH_VALUES: CardLengthPreset[] = ['short', 'medium', 'long'];
const TIMER_VALUES = [0, 5, 10, 15];

interface ReadingSectionProps {
  isReader: boolean;
  onCardLengthChange?: (preset: CardLengthPreset) => void;
  onTimerSelect?: (minutes: number) => void;
}

/** Читання: card length, focus timer (reader only), time left, eye break, screen on. */
export function ReadingSection({ isReader, onCardLengthChange, onTimerSelect }: ReadingSectionProps) {
  const i18n = useI18n();
  const t = i18n.m.settings;
  const LENGTHS = LENGTH_VALUES.map((value) => ({ value, label: t.lengths[value] }));
  const TIMERS = TIMER_VALUES.map((value) => ({
    value,
    label: value === 0 ? t.timerOff : i18n.format(t.minutesShort, { minutes: value })
  }));
  const { cardLength, showTimeLeft, eyeBreakReminder, keepScreenOn, updateSettings } =
    useSettingsStore();
  const timerMinutes = useReaderStore((s) => s.timerMinutes);
  const wakeLockSupported = screenWakeLock().supported;

  return (
    <>
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
          <label htmlFor="toggle-time-left" className="setting-label">
            {t.timeLeft}
          </label>
          <p className="setting-hint">{t.timeLeftHint}</p>
        </div>
        <label className="switch">
          <input
            id="toggle-time-left"
            type="checkbox"
            checked={showTimeLeft}
            onChange={(e) => updateSettings({ showTimeLeft: e.target.checked })}
          />
          <span className="switch-slider" />
        </label>
      </div>

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
    </>
  );
}
