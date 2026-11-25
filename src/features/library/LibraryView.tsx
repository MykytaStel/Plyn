import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sun } from 'lucide-react';
import { cleanMarkdown } from '../../core/parsers/markdown';
import { db, removeDocument } from '../../services/storage/db';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LibraryCard } from './LibraryCard';

const SAMPLE_TEXT = `Коли перед очима відкривається довга «стіна тексту», мозок часто втомлюється ще до першого абзацу. Погляд зісковзує на сусідній рядок, і доводиться перечитувати одне й те саме речення по три рази.

Plyn прибирає це перевантаження. Замість нескінченного полотна ти бачиш лише одну коротку думку за раз — у спокійній рамці та з чіткими межами.

Свайпай вгору на iPhone або натискай Пробіл чи стрілки на MacBook, щоб рухатися далі. Верхня смужка показує реальний прогрес і дає мозку приємне відчуття завершеності.

Спробуй увімкнути режим «Якір» у верхньому правому куті або натисни клавішу A. Виділений початок кожного слова працює як точка опори — очі перестають «пливти», і читати стає помітно легше.

Ти також можеш ставити закладки на важливих картках (іконка прапорця або клавіша B), імпортувати файли .txt / .md та вмикати м’який таймер фокусу в налаштуваннях.`;

export function LibraryView() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState('');
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

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(''), 3200);
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

    try {
      const raw = await file.text();
      const isMd = file.name.toLowerCase().endsWith('.md');
      const prepared = isMd ? cleanMarkdown(raw) : raw.trim();
      if (!prepared) {
        showFeedback('Файл порожній.');
        return;
      }

      setTitle(file.name.replace(/\.(txt|md)$/i, ''));
      setText(prepared);
      showFeedback(`Імпортовано «${file.name}». Натисни «Почати читання».`);
    } catch {
      showFeedback('Не вдалося прочитати файл.');
    } finally {
      e.target.value = '';
    }
  };

  const handleStart = async () => {
    if (!text.trim()) return;
    await startNewDocument(title, text, cardLength);
    setTitle('');
    setText('');
  };

  const charCount = text.trim().length;

  return (
    <main className="view view-input" aria-label="Ввід тексту та бібліотека">
      <header className="input-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Plyn</span>
        </div>
        <button
          className="icon-btn"
          type="button"
          aria-label="Змінити тему"
          title="Змінити тему"
          onClick={cycleTheme}
        >
          <Sun size={20} />
        </button>
      </header>

      <section className="input-container">
        <div className="hero-copy">
          <h1>Читай у своєму ритмі</h1>
          <p>
            Встав текст або імпортуй файл — Plyn розіб’є його на короткі картки й
            збереже прогрес у твоїй бібліотеці.
          </p>
        </div>

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
                Імпорт .txt / .md
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
                accept=".txt,.md,text/plain,text/markdown"
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
                  onDelete={(id) => void removeDocument(id)}
                />
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
