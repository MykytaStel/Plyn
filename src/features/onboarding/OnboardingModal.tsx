import { useState } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { tokenizeWithAnchors } from '../../core/anchor/anchor';
import type { ThemeMode } from '../../core/models/types';
import { useI18n } from '../../i18n';
import { useSettingsStore } from '../../store/useSettingsStore';

const ONBOARDING_KEY = 'plyn_onboarding_done_v1';

export function isOnboardingDone(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return true;
  }
}

export function markOnboardingDone(): void {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // Ігноруємо у приватному режимі
  }
}

interface OnboardingModalProps {
  onClose: () => void;
  onTrySample: () => void;
}

const QUICK_THEMES: ThemeMode[] = ['dark', 'paper', 'mint'];

export function OnboardingModal({
  onClose,
  onTrySample
}: OnboardingModalProps) {
  const i18n = useI18n();
  const t = i18n.m.onboarding;
  const [step, setStep] = useState(0);
  const { theme, anchorMode, updateSettings } = useSettingsStore();

  const finish = (startSample = false) => {
    markOnboardingDone();
    onClose();
    if (startSample) onTrySample();
  };

  const tokens = anchorMode ? tokenizeWithAnchors(t.demoPreview) : null;

  return (
    <>
      <div
        className="sheet-backdrop"
        onClick={() => finish(false)}
        aria-hidden="true"
      />
      <aside
        className="onboarding-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="onboarding-top">
          <div className="onboarding-dots" aria-label={i18n.format(t.stepOf, { step: step + 1, total: 3 })}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`onboarding-dot ${i === step ? 'is-active' : ''}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={t.skipLabel}
            onClick={() => finish(false)}
          >
            <X size={18} />
          </button>
        </div>

        {step === 0 && (
          <div className="onboarding-body">
            <span className="onboarding-kicker">
              <Sparkles size={14} /> {t.step1.kicker}
            </span>
            <h2 id="onboarding-title">{t.step1.title}</h2>
            <p className="onboarding-copy">
              {t.step1.before} <code>.epub</code> {t.step1.after}
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-body">
            <span className="onboarding-kicker">{t.step2.kicker}</span>
            <h2 id="onboarding-title">{t.step2.title}</h2>
            <div className={`onboarding-preview ${anchorMode ? 'anchor-active' : ''}`}>
              <p>
                {tokens
                  ? tokens.map((token, idx) =>
                      token.type === 'word' ? (
                        <span key={idx}>
                          <span className="anchor-lead">{token.lead}</span>
                          {token.rest}
                        </span>
                      ) : (
                        <span key={idx}>{token.value}</span>
                      )
                    )
                  : t.demoPreview}
              </p>
            </div>
            <div className="onboarding-controls">
              <div className="segmented">
                {QUICK_THEMES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`seg-btn ${theme === value ? 'is-active' : ''}`}
                    onClick={() => updateSettings({ theme: value })}
                  >
                    {i18n.m.settings.themes[value]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => updateSettings({ anchorMode: !anchorMode })}
              >
                {anchorMode ? t.step2.anchorOff : t.step2.anchorOn}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-body">
            <span className="onboarding-kicker">{t.step3.kicker}</span>
            <h2 id="onboarding-title">{t.step3.title}</h2>
            <p className="onboarding-copy">
              {t.step3.before} <strong>Space</strong> {t.step3.after}
            </p>
          </div>
        )}

        <div className="onboarding-footer">
          {step < 2 ? (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => finish(false)}
              >
                {t.skip}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setStep((s) => s + 1)}
              >
                <span>{t.next}</span>
                <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => finish(false)}
              >
                {t.ownText}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => finish(true)}
              >
                {t.trySample}
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
