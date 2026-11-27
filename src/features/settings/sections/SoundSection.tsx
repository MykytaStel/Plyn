import type { TtsRatePreset } from '../../../core/models/types';
import type { ContentLanguage } from '../../../core/language/detectContentLanguage';
import { useI18n } from '../../../i18n';
import { isTtsSupported, speakPreview } from '../../../services/speech/tts';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { useVoices } from '../useVoices';

const TTS_RATES: Array<{ value: TtsRatePreset; label: string }> = [
  { value: 0.75, label: '0.75×' },
  { value: 1, label: '1×' },
  { value: 1.25, label: '1.25×' },
  { value: 1.5, label: '1.5×' }
];

interface SoundSectionProps {
  isReader: boolean;
  brownNoiseOn?: boolean;
  onToggleBrownNoise?: (enabled: boolean) => void;
}

/** Звук і голос: brown noise (reader only), keep listening, speed, highlight, voices. */
export function SoundSection({ isReader, brownNoiseOn, onToggleBrownNoise }: SoundSectionProps) {
  const i18n = useI18n();
  const t = i18n.m.settings;
  const { ttsRate, ttsAutoAdvance, ttsWordHighlight, ttsVoices, updateSettings } =
    useSettingsStore();
  const speechSupported = isTtsSupported();
  const ukVoices = useVoices('uk');
  const enVoices = useVoices('en');
  const chooseVoice = (lang: ContentLanguage, uri: string) => {
    const next = { ...ttsVoices };
    if (uri) next[lang] = uri;
    else delete next[lang];
    updateSettings({ ttsVoices: next });
    speakPreview(t.voiceSamples[lang], lang, uri || undefined);
  };
  const VOICE_SELECTS = [
    { lang: 'uk' as const, label: t.voiceUk, voices: ukVoices },
    { lang: 'en' as const, label: t.voiceEn, voices: enVoices }
  ];

  return (
    <>
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

      <div className="setting-row-toggle">
        <div>
          <label htmlFor="toggle-tts-highlight" className="setting-label">
            {t.wordHighlight}
          </label>
          <p className="setting-hint">
            {speechSupported ? t.wordHighlightHint : t.speechUnavailable}
          </p>
        </div>
        <label className="switch">
          <input
            id="toggle-tts-highlight"
            type="checkbox"
            checked={ttsWordHighlight}
            disabled={!speechSupported}
            onChange={(e) => updateSettings({ ttsWordHighlight: e.target.checked })}
          />
          <span className="switch-slider" />
        </label>
      </div>

      {VOICE_SELECTS.map(({ lang, label, voices }) => (
        <div className="setting-group" key={lang}>
          <label htmlFor={`select-voice-${lang}`} className="setting-label">
            {label}
          </label>
          <select
            id={`select-voice-${lang}`}
            className="setting-select"
            value={voices.some((v) => v.uri === ttsVoices[lang]) ? ttsVoices[lang] : ''}
            disabled={!speechSupported}
            onChange={(e) => chooseVoice(lang, e.target.value)}
          >
            <option value="">{t.voiceDefault}</option>
            {voices.map((v) => (
              <option key={v.uri} value={v.uri}>
                {v.local ? v.name : i18n.format(t.voiceNetwork, { name: v.name })}
              </option>
            ))}
          </select>
        </div>
      ))}
    </>
  );
}
