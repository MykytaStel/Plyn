import { useI18n } from '../../../i18n';
import { useSettingsStore } from '../../../store/useSettingsStore';

interface AidsSectionProps {
  /** Syllable hints ship only if EXP-03 passes (Task 11). */
  showSyllables: boolean;
}

/** Підказки: anchor, sentence focus, syllable hints. */
export function AidsSection({ showSyllables }: AidsSectionProps) {
  const t = useI18n().m.settings;
  const { anchorMode, sentenceFocus, syllableHints, updateSettings } = useSettingsStore();

  return (
    <>
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
      {showSyllables && (
        <div className="setting-row-toggle">
          <div>
            <label htmlFor="toggle-syllable-hints" className="setting-label">
              {t.syllableHints}
            </label>
            <p className="setting-hint">{t.syllableHintsHint}</p>
          </div>
          <label className="switch">
            <input
              id="toggle-syllable-hints"
              type="checkbox"
              checked={syllableHints}
              onChange={(e) => updateSettings({ syllableHints: e.target.checked })}
            />
            <span className="switch-slider" />
          </label>
        </div>
      )}
    </>
  );
}
