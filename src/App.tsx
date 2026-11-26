import { useEffect } from 'react';
import { useI18n } from './i18n';
import { LibraryView } from './features/library/LibraryView';
import { ReaderView } from './features/reader/ReaderView';
import { migrateLegacyLocalSession } from './services/storage/db';
import { useReaderStore } from './store/useReaderStore';
import { useSettingsStore } from './store/useSettingsStore';

export function App() {
  const activeDoc = useReaderStore((s) => s.activeDoc);
  const applyToDom = useSettingsStore((s) => s.applyToDom);

  useEffect(() => {
    applyToDom();
    void migrateLegacyLocalSession();
  }, [applyToDom]);

  const { m } = useI18n();
  useEffect(() => {
    document.title = m.meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', m.meta.description);
  }, [m]);

  return activeDoc ? <ReaderView /> : <LibraryView />;
}
