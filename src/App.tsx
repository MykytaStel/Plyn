import { useEffect } from 'react';
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

  return activeDoc ? <ReaderView /> : <LibraryView />;
}
