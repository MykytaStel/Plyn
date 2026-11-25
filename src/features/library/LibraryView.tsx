import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link2, Sun, Trophy } from 'lucide-react';
import { ACHIEVEMENTS } from '../../core/achievements/achievements';
import { parseEpubFile } from '../../core/parsers/epub';
import { cleanMarkdown } from '../../core/parsers/markdown';
import { extractArticleFromUrl } from '../../services/extract/urlExtractor';
import { db, removeDocument, renameDocument } from '../../services/storage/db';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { AchievementsSheet } from '../achievements/AchievementsSheet';
import { LibraryCard } from './LibraryCard';

const SAMPLE_TEXT = `Коли перед очима відкривається довга «стіна тексту», мозок часто втомлюється ще до першого абзацу. Погляд зісковзує на сусідній рядок, і доводиться перечитувати одне й те саме речення по три рази.

Plyn прибирає це перевантаження. Замість нескінченного полотна ти бачиш лише одну коротку думку за раз — у спокійній рамці та з чіткими межами.

Свайпай вгору на iPhone або натискай Пробіл чи стрілки на MacBook, щоб рухатися далі. Верхня смужка показує реальний прогрес і орієнтовний час до кінця.

Спробуй увімкнути режим «Якір» (клавіша A), шрифт для дислексії в налаштуваннях або озвучку картки (клавіша S), коли очі вже втомилися.

Ти також можеш ставити закладки (клавіша B), імпортувати книги .epub, файли .txt / .md або завантажувати статті прямо за посиланням.`;

export function LibraryView() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(''), 3600);
  };

  const handlePaste = async () => {
    if (!navigator.clipboard?.readText) {
      showFeedback('Встав текст вручну у поле вище (Cmd+V або довгий тап).');
      textAreaRef.current?.focus();
      return;
    }
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText.trim()) {
        showFeedback('Буфер обміну порожній.');
        return;
      }
      setText(clipText);
      showFeedback('Текст вставлено з буфера.');
    } catch {
      showFeedback('Браузер обмежив доступ — встав текст вручну у поле вище.');
      textAreaRef.current?.focus();
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith('.epub')) {
        showFeedback('Розпаковую книгу EPUB...');
        const parsed = await parseEpubFile(file);
        setTitle(parsed.title);
        setText(parsed.text);
        showFeedback(`Книгу «${parsed.title}» завантажено. Натисни «Почати читання».`);
      } else {
        const raw = await file.text();
        const prepared = lower.endsWith('.md') ? cleanMarkdown(raw) : raw.trim();
        if (!prepared) {
          showFeedback('Файл порожній.');
          return;
        }
        setTitle(file.name.replace(/\.(txt|md)$/i, ''));
        setText(prepared);
        showFeedback(`Імпортовано «${file.name}». Натисни «Почати читання».`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не вдалося прочитати файл.';
      showFeedback(msg);
    } finally {
      e.target.value = '';
    }
  };

  const handleUrlExtract = async () => {
    if (!urlInput.trim() || isExtracting) return;
    setIsExtracting(true);
    showFeedback('Завантажую статтю...');
    try {
      const article = await extractArticleFromUrl(urlInput);
      setTitle(article.title);
      setText(article.text);
      setUrlInput('');
      setShowUrlBar(false);
      showFeedback(`Статтю «${article.title}» завантажено.`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Не вдалося витягти текст статті.';
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
  };

  const charCount = text.trim().length;
  const unlockedCount = stats?.unlockedIds?.length ?? 0;

  return (
    <main className="view view-input" aria-label="Ввід тексту та бібліотека">
      <header className="input-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Plyn</span>
        </div>
        <div className="header-actions">
          <button
            className="awards-pill"
            type="button"
            aria-label="Прогрес і нагороди"
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
            aria-label="Змінити тему"
            title="Змінити тему"
            onClick={cycleTheme}
          >
            <Sun size={20} />
          </button>
        </div>
      </header>

      <section className="input-container">
        <div className="hero-copy">
          <h1>Читай у своєму ритмі</h1>
          <p>
            Встав текст, посилання на статтю або книгу .epub — Plyn розіб’є все на
            короткі картки.
          </p>
        </div>

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
              {isExtracting ? '...' : 'Завантажити'}
            </button>
          </div>
        )}

        <div className="editor-box">
          <label htmlFor="title-input" className="sr-only">
            Назва тексту (необов’язково)
          </label>
          <input
            id="title-input"
            className="title-input"
            type="text"
            placeholder="Назва (необов’язково — згенерується автоматично)"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="text-input" className="sr-only">
            Текст для читання
          </label>
          <textarea
            ref={textAreaRef}
            id="text-input"
            className="text-input"
            placeholder="Встав сюди статтю, конспект або розділ книги..."
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
                З буфера
              </button>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                .txt / .md / .epub
              </button>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => setShowUrlBar((v) => !v)}
              >
                <Link2 size={14} />
                <span>За URL</span>
              </button>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  setTitle('Знайомство з Plyn');
                  setText(SAMPLE_TEXT);
                  showFeedback('Приклад завантажено. Натисни «Почати читання».');
                }}
              >
                Приклад
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.epub,text/plain,text/markdown,application/epub+zip"
                hidden
                onChange={handleFileImport}
              />
            </div>
            <span className="char-count">
              {charCount.toLocaleString('uk-UA')} символів
            </span>
          </div>
        </div>

        <p className="input-feedback" role="status" aria-live="polite">
          {feedback}
        </p>

        <button
          className="btn btn-primary btn-lg"
          type="button"
          disabled={charCount === 0}
          onClick={handleStart}
        >
          Почати читання
        </button>

        {documents && documents.length > 0 && (
          <section className="library-section" aria-label="Моя бібліотека">
            <div className="library-header">
              <h2>Моя бібліотека</h2>
              <span className="library-count">{documents.length}</span>
            </div>
            <div className="library-list">
              {documents.map((doc) => (
                <LibraryCard
                  key={doc.id}
                  doc={doc}
                  onOpen={(d) => openDocument(d, cardLength)}
                  onRename={(id, newTitle) => void renameDocument(id, newTitle)}
                  onDelete={(id) => void removeDocument(id)}
                />
              ))}
            </div>
          </section>
        )}
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
    </main>
  );
}
