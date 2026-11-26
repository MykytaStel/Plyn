import { useState } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { tokenizeWithAnchors } from '../../core/anchor/anchor';
import type { ThemeMode } from '../../core/models/types';
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

const DEMO_PREVIEW =
  'Режим «Якір» підсвічує початок кожного слова, щоб погляд не ковзав по рядках.';

const QUICK_THEMES: Array<{ value: ThemeMode; label: string }> = [
  { value: 'dark', label: 'Темна' },
  { value: 'paper', label: 'Папір' },
  { value: 'mint', label: 'М’ята' }
];

export function OnboardingModal({
  onClose,
  onTrySample
}: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const { theme, anchorMode, updateSettings } = useSettingsStore();

  const finish = (startSample = false) => {
    markOnboardingDone();
    onClose();
    if (startSample) onTrySample();
  };

  const tokens = anchorMode ? tokenizeWithAnchors(DEMO_PREVIEW) : null;

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
          <div className="onboarding-dots" aria-label={`Крок ${step + 1} з 3`}>
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
            aria-label="Пропустити знайомство"
            onClick={() => finish(false)}
          >
            <X size={18} />
          </button>
        </div>

        {step === 0 && (
          <div className="onboarding-body">
            <span className="onboarding-kicker">
              <Sparkles size={14} /> Знайомство · 1 з 3
            </span>
            <h2 id="onboarding-title">Читай без «стін тексту»</h2>
            <p className="onboarding-copy">
              Plyn розбиває довгі статті, конспекти й книги <code>.epub</code>{' '}
              на короткі картки. Мозок бачить чіткі межі та реальний прогрес —
              очі втомлюються значно менше.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-body">
            <span className="onboarding-kicker">Налаштуй під себе · 2 з 3</span>
            <h2 id="onboarding-title">Спокійні теми та «Якір»</h2>
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
                  : DEMO_PREVIEW}
              </p>
            </div>
            <div className="onboarding-controls">
              <div className="segmented">
                {QUICK_THEMES.map((item) => (
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
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => updateSettings({ anchorMode: !anchorMode })}
              >
                {anchorMode ? 'Вимкнути «Якір»' : 'Спробувати «Якір»'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-body">
            <span className="onboarding-kicker">Готово до старту · 3 з 3</span>
            <h2 id="onboarding-title">Свайпай або тисни Пробіл</h2>
            <p className="onboarding-copy">
              На iPhone свайпай картки вгору, на MacBook натискай{' '}
              <strong>Space</strong> чи стрілки. У налаштуваннях також є шрифт
              для дислексії, «Фокус-речення», озвучка та «Чистий екран».
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
                Пропустити
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setStep((s) => s + 1)}
              >
                <span>Далі</span>
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
                До свого тексту
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => finish(true)}
              >
                Спробувати приклад
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
