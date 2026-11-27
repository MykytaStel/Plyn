import { ChevronLeft, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CardLengthPreset } from '../../core/models/types';
import { READING_PRESETS } from '../../core/presets/readingPresets';
import { useReaderStore } from '../../store/useReaderStore';
import { APP_VERSION } from '../../appVersion';
import { useI18n } from '../../i18n';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useBackLayer } from '../shared/useBackLayer';
import { useDialogFocus } from '../shared/useDialogFocus';
import { SettingsRow } from './SettingsRow';
import { SETTINGS_SECTIONS, settingsSummary, type SettingsSection } from './settingsSummary';
import { AidsSection } from './sections/AidsSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { LanguageLibrarySection, useStorageStatus } from './sections/LanguageLibrarySection';
import { ReadingSection } from './sections/ReadingSection';
import { SoundSection } from './sections/SoundSection';

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

/**
 * Settings as a short list (0.27, option B): presets and five rows, each with
 * a summary; a row opens its section in the same sheet. Back and Escape step
 * out of a section first, then close the sheet. Every section always has
 * content (from the library too), so all five rows always show.
 */
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
  const settings = useSettingsStore();
  const timerMinutes = useReaderStore((s) => s.timerMinutes);
  const isReader = Boolean(onTimerSelect);
  const storage = useStorageStatus();

  const [section, setSection] = useState<SettingsSection | null>(null);
  const lastSection = useRef<SettingsSection | null>(null);
  const rowRefs = useRef<Partial<Record<SettingsSection, HTMLButtonElement | null>>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  const openSection = (next: SettingsSection) => {
    lastSection.current = next;
    setSection(next);
  };
  const backToList = () => setSection(null);

  // One more back layer while a section is open: back returns to the list.
  useBackLayer(section !== null, backToList);

  // Focus: the section heading when it opens, the row it came from when it closes.
  useEffect(() => {
    dialogRef.current?.scrollTo?.({ top: 0 });
    if (section) headingRef.current?.focus({ preventScroll: true });
    else if (lastSection.current) {
      rowRefs.current[lastSection.current]?.focus({ preventScroll: true });
    }
  }, [section, dialogRef]);

  // Escape is the sheet's own: it never reaches the screen behind it.
  const latest = useRef({ section, onClose });
  useEffect(() => {
    latest.current = { section, onClose };
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (latest.current.section) setSection(null);
      else latest.current.onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const storageLabel =
    storage.status?.usageBytes != null ? i18n.bytes(storage.status.usageBytes) : '';
  const summaryContext = { i18n, timerMinutes, storageLabel, isReader };

  const closeButton = (
    <button className="icon-btn" type="button" aria-label={t.close} onClick={onClose}>
      <X size={20} />
    </button>
  );

  return (
    <aside
      ref={dialogRef}
      className="bottom-sheet settings-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby={section ? 'settings-section-title' : 'settings-title'}
    >
      <div className="sheet-handle" aria-hidden="true" />

      {section === null ? (
        <div className="settings-screen settings-screen-list" key="list">
          <div className="sheet-header">
            <h2 id="settings-title">{t.title}</h2>
            {closeButton}
          </div>

          <div className="sheet-body">
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
                      settings.updateSettings(preset.patch);
                      onPresetApplied?.(i18n.m.presets[preset.id].label);
                    }}
                  >
                    <span className="preset-btn-title">{i18n.m.presets[preset.id].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-rows">
              {SETTINGS_SECTIONS.map((id) => (
                <SettingsRow
                  key={id}
                  ref={(el) => {
                    rowRefs.current[id] = el;
                  }}
                  title={t.sections[id]}
                  summary={settingsSummary(id, settings, summaryContext)}
                  onOpen={() => openSection(id)}
                />
              ))}
            </div>

            <p className="app-version">{i18n.format(t.version, { version: APP_VERSION })}</p>
          </div>
        </div>
      ) : (
        <div className="settings-screen settings-screen-section" key={section}>
          <div className="sheet-header settings-section-header">
            <button type="button" className="settings-back" onClick={backToList}>
              <ChevronLeft size={18} aria-hidden="true" />
              <span>{t.back}</span>
            </button>
            {closeButton}
          </div>
          <h2
            id="settings-section-title"
            className="settings-section-heading"
            ref={headingRef}
            tabIndex={-1}
          >
            {t.sections[section]}
          </h2>

          <div className="sheet-body">
            {section === 'appearance' && <AppearanceSection />}
            {section === 'reading' && (
              <ReadingSection
                isReader={isReader}
                onCardLengthChange={onCardLengthChange}
                onTimerSelect={onTimerSelect}
              />
            )}
            {section === 'aids' && <AidsSection showSyllables={false} />}
            {section === 'sound' && (
              <SoundSection
                isReader={isReader}
                brownNoiseOn={brownNoiseOn}
                onToggleBrownNoise={onToggleBrownNoise}
              />
            )}
            {section === 'languageLibrary' && (
              <LanguageLibrarySection
                canRestore={!isReader}
                storage={storage.status}
                onStorageChange={storage.refresh}
              />
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
