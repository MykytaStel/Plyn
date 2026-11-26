import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ChevronUp,
  Download,
  HelpCircle,
  Lightbulb,
  Link2,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trophy,
  Upload
} from 'lucide-react';
import { ACHIEVEMENTS } from '../../core/achievements/achievements';
import { parseEpubFile } from '../../core/parsers/epub';
import { cleanMarkdown } from '../../core/parsers/markdown';
import { extractArticleFromUrl } from '../../services/extract/urlExtractor';
import {
  exportLibraryBackup,
  importLibraryBackup
} from '../../services/storage/backup';
import { db, removeDocument, renameDocument } from '../../services/storage/db';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { AchievementsSheet } from '../achievements/AchievementsSheet';
import {
  isOnboardingDone,
  OnboardingModal
} from '../onboarding/OnboardingModal';
import { ThoughtsSheet } from '../thoughts/ThoughtsSheet';
import { useI18n } from '../../i18n';
import { errorMessage } from '../../i18n/errorMessage';
import { LibraryCard } from './LibraryCard';

type LibraryFilter = 'all' | 'active' | 'completed' | 'bookmarked';

const FILTER_VALUES: LibraryFilter[] = ['all', 'active', 'bookmarked', 'completed'];


export function LibraryView() {
  const i18n = useI18n();
  const t = i18n.m.library;
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showThoughts, setShowThoughts] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackTimerRef = useRef<number | undefined>(undefined);

  const cycleTheme = useSettingsStore((s) => s.cycleTheme);
  const cardLength = useSettingsStore((s) => s.cardLength);
  const startNewDocument = useReaderStore((s) => s.startNewDocument);
  const openDocument = useReaderStore((s) => s.openDocument);

  const documents = useLiveQuery(
    () => db.documents.orderBy('updatedAt').reverse().toArray(),
    []
  );
  const stats = useLiveQuery(() => db.stats.get('main'), []);
  const thoughtsCount = useLiveQuery(() => db.thoughts.count(), []) ?? 0;

  const hasLibrary = Boolean(documents && documents.length > 0);
  const isEditorVisible = !hasLibrary || showEditor;

  const nextUnfinishedDoc = useMemo(
    () => documents?.find((d) => !d.completedOnce) ?? documents?.[0] ?? null,
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    const q = searchQuery.trim().toLowerCase();

    return documents.filter((doc) => {
      if (filter === 'active' && doc.completedOnce) return false;
      if (filter === 'completed' && !doc.completedOnce) return false;
      if (filter === 'bookmarked' && (doc.bookmarkOffsets?.length ?? 0) === 0) {
        return false;
      }
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.text.toLowerCase().includes(q)
      );
    });
  }, [documents, searchQuery, filter]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(''), 3600);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('url')?.trim() || '';
    const sharedText = params.get('text')?.trim() || '';
    const sharedTitle = params.get('title')?.trim() || '';

    if (!sharedUrl && !sharedText) return;

    window.history.replaceState({}, '', window.location.pathname);
    setShowEditor(true);

    const urlCandidate =
      sharedUrl || (sharedText.match(/https?:\/\/\S+/i)?.[0] ?? '');

    if (urlCandidate) {
      setShowUrlBar(true);
      setUrlInput(urlCandidate);
      setIsExtracting(true);
      showFeedback(t.feedback.sharedArticleLoading);
      void extractArticleFromUrl(urlCandidate)
        .then((article) => {
          setTitle(sharedTitle || article.title);
          setText(article.text);
          setShowUrlBar(false);
          setUrlInput('');
          showFeedback(i18n.format(t.feedback.articleLoaded, { title: article.title }));
        })
        .catch(() => {
          if (sharedText) {
            setTitle(sharedTitle);
            setText(sharedText);
          }
          showFeedback(t.feedback.sharedArticleFailed);
        })
        .finally(() => setIsExtracting(false));
    } else if (sharedText) {
      setTitle(sharedTitle);
      setText(sharedText);
      showFeedback(t.feedback.sharedText);
    }
  }, []);

  const handlePaste = async () => {
    if (!navigator.clipboard?.readText) {
      showFeedback(t.feedback.pasteManually);
      textAreaRef.current?.focus();
      return;
    }
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText.trim()) {
        showFeedback(t.feedback.clipboardEmpty);
        return;
      }
      setText(clipText);
      showFeedback(t.feedback.clipboardPasted);
    } catch {
      showFeedback(t.feedback.clipboardDenied);
      textAreaRef.current?.focus();
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith('.epub')) {
        showFeedback(t.feedback.epubLoading);
        const parsed = await parseEpubFile(file);
        setTitle(parsed.title);
        setText(parsed.text);
        showFeedback(
          i18n.format(t.feedback.epubLoaded, { title: parsed.title })
        );
      } else if (lower.endsWith('.pdf')) {
        showFeedback(t.feedback.pdfLoading);
        const { parsePdfFile } = await import('../../core/parsers/pdf');
        const parsed = await parsePdfFile(file);
        setTitle(parsed.title);
        setText(parsed.text);
        showFeedback(
          i18n.format(t.feedback.pdfLoaded, { title: parsed.title })
        );
      } else {
        const raw = await file.text();
        const prepared = lower.endsWith('.md') ? cleanMarkdown(raw) : raw.trim();
        if (!prepared) {
          showFeedback(t.feedback.fileEmpty);
          return;
        }
        setTitle(file.name.replace(/\.(txt|md)$/i, ''));
        setText(prepared);
        showFeedback(i18n.format(t.feedback.fileImported, { name: file.name }));
      }
    } catch (err) {
      const msg =
        errorMessage(err, i18n.m, i18n.m.errors.file_read);
      showFeedback(msg);
    } finally {
      e.target.value = '';
    }
  };

  const handleExportBackup = async () => {
    try {
      const payload = await exportLibraryBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plyn-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showFeedback(t.feedback.backupSaved);
    } catch {
      showFeedback(t.feedback.backupFailed);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const { importedDocs } = await importLibraryBackup(raw);
      showFeedback(
        i18n.format(t.feedback.backupImported, {
          texts: i18n.plural(i18n.m.common.texts, importedDocs)
        })
      );
    } catch (err) {
      const msg =
        errorMessage(err, i18n.m, i18n.m.errors.backup_read);
      showFeedback(msg);
    } finally {
      e.target.value = '';
    }
  };

  const handleUrlExtract = async () => {
    if (!urlInput.trim() || isExtracting) return;
    setIsExtracting(true);
    showFeedback(t.feedback.articleLoading);
    try {
      const article = await extractArticleFromUrl(urlInput);
      setTitle(article.title);
      setText(article.text);
      setUrlInput('');
      setShowUrlBar(false);
      showFeedback(i18n.format(t.feedback.articleLoaded, { title: article.title }));
    } catch (err) {
      const msg =
        errorMessage(err, i18n.m, i18n.m.errors.article_read);
      showFeedback(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleStart = async () => {
    if (!text.trim()) return;
    await startNewDocument(title, text, cardLength);
    setTitle('');
    setText('');
    setShowEditor(false);
  };

  const charCount = text.trim().length;
  const unlockedCount = stats?.unlockedIds?.length ?? 0;

  return (
    <main className="view view-input" aria-label={t.mainLabel}>
      <header className="input-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Plyn</span>
        </div>
        <div className="header-actions">
          {thoughtsCount > 0 && (
            <button
              className="awards-pill"
              type="button"
              aria-label={t.thoughtsLabel}
              title={t.thoughtsHint}
              onClick={() => setShowThoughts(true)}
            >
              <Lightbulb size={15} />
              <span>{thoughtsCount}</span>
            </button>
          )}
          <button
            className="awards-pill"
            type="button"
            aria-label={i18n.m.achievementsSheet.title}
            onClick={() => setShowAchievements(true)}
          >
            <Trophy size={15} />
            <span>
              {unlockedCount} / {ACHIEVEMENTS.length}
            </span>
          </button>
          <button
            className="icon-btn"
            type="button"
            aria-label={t.helpLabel}
            title={t.helpHint}
            onClick={() => setShowOnboarding(true)}
          >
            <HelpCircle size={19} />
          </button>
          <button
            className="icon-btn"
            type="button"
            aria-label={t.changeTheme}
            title={t.changeTheme}
            onClick={cycleTheme}
          >
            <Sun size={20} />
          </button>
        </div>
      </header>

      <section className="input-container">
        {!hasLibrary && (
          <div className="hero-copy">
            <h1>{t.heroTitle}</h1>
            <p>{t.heroText}</p>
          </div>
        )}

        {/* Легкий старт на 5 карток */}
        {nextUnfinishedDoc && (
          <div className="micro-start-banner">
            <div className="micro-start-text">
              <span className="micro-start-label">
                <Sparkles size={13} /> {t.microStartLabel}
              </span>
              <p className="micro-start-title">{nextUnfinishedDoc.title}</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openDocument(nextUnfinishedDoc, cardLength, 5)}
            >
              {t.microStartAction}
            </button>
          </div>
        )}

        {/* Компактна кнопка відкриття редактора, коли бібліотека вже не порожня */}
        {hasLibrary && (
          <button
            type="button"
            className={`btn ${isEditorVisible ? 'btn-secondary' : 'btn-primary'} btn-lg`}
            onClick={() => setShowEditor((v) => !v)}
          >
            {isEditorVisible ? (
              <>
                <ChevronUp size={18} />
                <span>{t.collapseEditor}</span>
              </>
            ) : (
              <>
                <Plus size={18} />
                <span>{t.expandEditor}</span>
              </>
            )}
          </button>
        )}

        {isEditorVisible && (
          <>
            {showUrlBar && (
              <div className="url-import-row">
                <input
                  type="url"
                  className="url-input"
                  placeholder="https://example.com/article"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleUrlExtract();
                  }}
                  disabled={isExtracting}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!urlInput.trim() || isExtracting}
                  onClick={() => void handleUrlExtract()}
                >
                  {isExtracting ? '...' : t.urlLoad}
                </button>
              </div>
            )}

            <div className="editor-box">
              <label htmlFor="title-input" className="sr-only">
                {t.titleLabel}
              </label>
              <input
                id="title-input"
                className="title-input"
                type="text"
                placeholder={t.titlePlaceholder}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <label htmlFor="text-input" className="sr-only">
                {t.textLabel}
              </label>
              <textarea
                ref={textAreaRef}
                id="text-input"
                className="text-input"
                placeholder={t.textPlaceholder}
                rows={7}
                spellCheck={false}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="editor-toolbar">
                <div className="toolbar-left">
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={handlePaste}
                  >
                    {t.fromClipboard}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    .txt / .md / .epub / .pdf
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => setShowUrlBar((v) => !v)}
                  >
                    <Link2 size={14} />
                    <span>{t.fromUrl}</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => {
                      setTitle(i18n.m.sample.title);
                      setText(i18n.m.sample.text);
                      showFeedback(t.feedback.sampleLoaded);
                    }}
                  >
                    {t.sample}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.epub,.pdf,text/plain,text/markdown,application/epub+zip,application/pdf"
                    hidden
                    onChange={handleFileImport}
                  />
                </div>
                <span className="char-count">
                  {i18n.plural(t.characters, charCount)}
                </span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              type="button"
              disabled={charCount === 0}
              onClick={handleStart}
            >
              {t.start}
            </button>
          </>
        )}

        {feedback && (
          <p className="input-feedback" role="status" aria-live="polite">
            {feedback}
          </p>
        )}

        <section className="library-section" aria-label={t.libraryTitle}>
          <div className="library-header">
            <div className="library-header-left">
              <h2>{t.libraryTitle}</h2>
              {documents && documents.length > 0 && (
                <span className="library-count">{documents.length}</span>
              )}
            </div>
            <div className="library-backup-actions">
              {documents && documents.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title={t.backupHint}
                  onClick={() => void handleExportBackup()}
                >
                  <Download size={14} />
                  <span>{t.backup}</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                title={t.importHint}
                onClick={() => backupInputRef.current?.click()}
              >
                <Upload size={14} />
                <span>{t.import}</span>
              </button>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={handleImportBackup}
              />
            </div>
          </div>

          {documents && documents.length >= 2 && (
            <>
              <div
                className="library-filters"
                role="tablist"
                aria-label={t.filterLabel}
              >
                {FILTER_VALUES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={filter === value}
                    className={`filter-chip ${filter === value ? 'is-active' : ''}`}
                    onClick={() => setFilter(value)}
                  >
                    {t.filters[value]}
                  </button>
                ))}
              </div>
              <div className="library-search">
                <Search size={15} className="library-search-icon" />
                <input
                  type="search"
                  className="library-search-input"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </>
          )}

          {filteredDocuments.length > 0 ? (
            <div className="library-list">
              {filteredDocuments.map((doc) => (
                <LibraryCard
                  key={doc.id}
                  doc={doc}
                  onOpen={(d) => openDocument(d, cardLength)}
                  onRename={(id, newTitle) => void renameDocument(id, newTitle)}
                  onDelete={(id) => void removeDocument(id)}
                />
              ))}
            </div>
          ) : (
            documents &&
            documents.length > 0 && (
              <p className="bookmarks-empty">
                {t.filterEmpty}
              </p>
            )
          )}
        </section>
      </section>

      {showAchievements && (
        <>
          <div
            className="sheet-backdrop"
            onClick={() => setShowAchievements(false)}
            aria-hidden="true"
          />
          <AchievementsSheet
            stats={stats}
            onClose={() => setShowAchievements(false)}
          />
        </>
      )}

      {showThoughts && (
        <>
          <div
            className="sheet-backdrop"
            onClick={() => setShowThoughts(false)}
            aria-hidden="true"
          />
          <ThoughtsSheet onClose={() => setShowThoughts(false)} />
        </>
      )}

      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          onTrySample={() => {
            void startNewDocument(i18n.m.sample.title, i18n.m.sample.text, cardLength);
          }}
        />
      )}
    </main>
  );
}
