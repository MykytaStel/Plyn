import { splitTextIntoCards, formatWithAnchors } from './splitter.js';
import {
  loadSettings,
  saveSettings,
  loadSession,
  clearSession
} from './storage.js';
import {
  getAllDocuments,
  getDocument,
  saveDocument,
  deleteDocument,
  deriveTitle
} from './db.js';

const THEME_META_COLORS = {
  dark: '#16181D',
  paper: '#F4EFE6',
  gray: '#2C2F33'
};

const THEME_ORDER = ['dark', 'paper', 'gray'];

const SAMPLE_TEXT = `Коли перед очима відкривається довга «стіна тексту», мозок часто втомлюється ще до першого абзацу. Погляд зісковзує на сусідній рядок, і доводиться перечитувати одне й те саме речення по три рази.

Plyn прибирає це перевантаження. Замість нескінченного полотна ти бачиш лише одну коротку думку за раз — у спокійній рамці та з чіткими межами.

Свайпай вгору на iPhone або натискай Пробіл чи стрілки на MacBook, щоб рухатися далі. Верхня смужка показує реальний прогрес і дає мозку приємне відчуття завершеності.

Спробуй увімкнути режим «Якір» у верхньому правому куті або натисни клавішу A. Виділений початок кожного слова працює як точка опори — очі перестають «пливти», і читати стає помітно легше.

Ти також можеш ставити закладки на важливих картках (іконка прапорця або клавіша B), імпортувати файли .txt / .md та вмикати м’який таймер фокусу в налаштуваннях.`;

const state = {
  settings: loadSettings(),
  activeDoc: null,
  cards: [],
  currentIndex: 0,
  observer: null,
  timerMinutes: 0,
  timerEndsAt: 0,
  timerInterval: null
};

const els = {
  metaThemeColor: document.getElementById('meta-theme-color'),
  viewInput: document.getElementById('view-input'),
  viewReader: document.getElementById('view-reader'),

  btnQuickTheme: document.getElementById('btn-quick-theme'),
  titleInput: document.getElementById('title-input'),
  textInput: document.getElementById('text-input'),
  charCount: document.getElementById('char-count'),
  inputFeedback: document.getElementById('input-feedback'),
  btnPaste: document.getElementById('btn-paste'),
  btnImport: document.getElementById('btn-import'),
  fileImport: document.getElementById('file-import'),
  btnSample: document.getElementById('btn-sample'),
  btnStart: document.getElementById('btn-start'),

  librarySection: document.getElementById('library-section'),
  libraryCount: document.getElementById('library-count'),
  libraryList: document.getElementById('library-list'),

  progressTrack: document.getElementById('progress-track'),
  progressFill: document.getElementById('progress-fill'),
  cardCounter: document.getElementById('card-counter'),
  timerPill: document.getElementById('timer-pill'),
  btnBack: document.getElementById('btn-back'),
  btnBookmark: document.getElementById('btn-bookmark'),
  btnBookmarksList: document.getElementById('btn-bookmarks-list'),
  bookmarksBadge: document.getElementById('bookmarks-badge'),
  btnAnchorQuick: document.getElementById('btn-anchor-quick'),
  btnSettings: document.getElementById('btn-settings'),
  cardsFeed: document.getElementById('cards-feed'),
  readerToast: document.getElementById('reader-toast'),
  btnPrevCard: document.getElementById('btn-prev-card'),
  btnNextCard: document.getElementById('btn-next-card'),

  sheetBackdrop: document.getElementById('sheet-backdrop'),
  settingsSheet: document.getElementById('settings-sheet'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  bookmarksSheet: document.getElementById('bookmarks-sheet'),
  btnCloseBookmarks: document.getElementById('btn-close-bookmarks'),
  bookmarksList: document.getElementById('bookmarks-list'),

  toggleAnchor: document.getElementById('toggle-anchor'),
  rangeFontSize: document.getElementById('range-font-size'),
  valFontSize: document.getElementById('val-font-size'),
  rangeLineHeight: document.getElementById('range-line-height'),
  valLineHeight: document.getElementById('val-line-height'),
  themeButtons: document.querySelectorAll('[data-theme-choice]'),
  lengthButtons: document.querySelectorAll('[data-length-choice]'),
  timerButtons: document.querySelectorAll('[data-timer-choice]')
};

/* ==========================================================================
   Налаштування вигляду
   ========================================================================== */

function applySettings() {
  const { theme, fontSize, lineHeight, anchorMode, cardLength } = state.settings;

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--reader-font-size', `${fontSize}px`);
  document.documentElement.style.setProperty('--reader-line-height', String(lineHeight));

  if (els.metaThemeColor) {
    els.metaThemeColor.setAttribute('content', THEME_META_COLORS[theme] || THEME_META_COLORS.dark);
  }

  els.cardsFeed.classList.toggle('anchor-active', anchorMode);
  els.btnAnchorQuick.setAttribute('aria-pressed', String(anchorMode));
  els.toggleAnchor.checked = anchorMode;

  els.rangeFontSize.value = String(fontSize);
  els.valFontSize.textContent = `${fontSize} px`;

  els.rangeLineHeight.value = String(lineHeight);
  els.valLineHeight.textContent = Number(lineHeight).toFixed(2);

  els.themeButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.themeChoice === theme);
  });

  els.lengthButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.lengthChoice === cardLength);
  });
}

function updateSettings(patch, { rerenderCards = false } = {}) {
  const prevTotal = state.cards.length || 1;
  const progressRatio = state.currentIndex / prevTotal;

  state.settings = { ...state.settings, ...patch };
  saveSettings(state.settings);
  applySettings();

  if (rerenderCards && !els.viewReader.hidden && state.activeDoc) {
    state.cards = splitTextIntoCards(state.activeDoc.text, {
      lengthPreset: state.settings.cardLength
    });
    const nextIndex = Math.min(
      state.cards.length - 1,
      Math.max(0, Math.round(progressRatio * state.cards.length))
    );
    state.activeDoc.totalCards = state.cards.length;
    state.activeDoc.bookmarks = (state.activeDoc.bookmarks || []).filter(
      (idx) => idx < state.cards.length
    );
    renderCards(nextIndex);
  }
}

/* ==========================================================================
   Бібліотека (IndexedDB) та імпорт файлів
   ========================================================================== */

async function migrateLegacySession() {
  const legacy = loadSession();
  if (!legacy) return;

  const docs = await getAllDocuments();
  const alreadyExists = docs.some((d) => d.text === legacy.text);
  if (!alreadyExists) {
    await saveDocument({
      title: deriveTitle(legacy.text),
      text: legacy.text,
      currentIndex: legacy.currentIndex || 0,
      totalCards: legacy.totalCards || 1,
      bookmarks: []
    });
  }
  clearSession();
}

async function renderLibrary() {
  const docs = await getAllDocuments();
  if (docs.length === 0) {
    els.librarySection.hidden = true;
    return;
  }

  els.librarySection.hidden = false;
  els.libraryCount.textContent = String(docs.length);
  els.libraryList.innerHTML = '';

  const fragment = document.createDocumentFragment();

  for (const doc of docs) {
    const total = Math.max(1, doc.totalCards || 1);
    const current = Math.min(doc.currentIndex || 0, total - 1);
    const percent = Math.round(((current + 1) / total) * 100);
    const bookmarksCount = (doc.bookmarks || []).length;

    const card = document.createElement('article');
    card.className = 'library-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Відкрити ${doc.title}`);

    const top = document.createElement('div');
    top.className = 'library-card-top';

    const title = document.createElement('h3');
    title.className = 'library-card-title';
    title.textContent = doc.title;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'library-delete-btn';
    delBtn.setAttribute('aria-label', `Видалити ${doc.title}`);
    delBtn.title = 'Видалити з бібліотеки';
    delBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
      </svg>
    `;

    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteDocument(doc.id);
      await renderLibrary();
    });

    top.appendChild(title);
    top.appendChild(delBtn);

    const meta = document.createElement('div');
    meta.className = 'library-card-meta';
    const metaParts = [`Картка ${current + 1} з ${total} · ${percent}%`];
    if (bookmarksCount > 0) {
      metaParts.push(`Закладок: ${bookmarksCount}`);
    }
    meta.textContent = metaParts.join(' · ');

    const progressBar = document.createElement('div');
    progressBar.className = 'library-progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'library-progress-fill';
    progressFill.style.width = `${percent}%`;
    progressBar.appendChild(progressFill);

    card.appendChild(top);
    card.appendChild(meta);
    card.appendChild(progressBar);

    const openHandler = async () => {
      const freshDoc = (await getDocument(doc.id)) || doc;
      openReaderWithDoc(freshDoc);
    };

    card.addEventListener('click', openHandler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openHandler();
      }
    });

    fragment.appendChild(card);
  }

  els.libraryList.appendChild(fragment);
}

/**
 * М'яко прибирає базову Markdown-розмітку, щоб текст у картках читався чисто.
 */
function cleanMarkdown(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .trim();
}

function updateInputState() {
  const len = els.textInput.value.trim().length;
  els.charCount.textContent = `${len.toLocaleString('uk-UA')} символів`;
  els.btnStart.disabled = len === 0;
}

function showFeedback(message) {
  els.inputFeedback.textContent = message;
  if (!message) return;
  window.clearTimeout(showFeedback._timer);
  showFeedback._timer = window.setTimeout(() => {
    els.inputFeedback.textContent = '';
  }, 3200);
}

function showToast(message) {
  els.readerToast.textContent = message;
  els.readerToast.hidden = false;
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    els.readerToast.hidden = true;
  }, 2800);
}

/* ==========================================================================
   Закладки та м'який таймер фокусу
   ========================================================================== */

function updateBookmarkUI() {
  if (!state.activeDoc) return;
  const bookmarks = state.activeDoc.bookmarks || [];
  const isBookmarked = bookmarks.includes(state.currentIndex);

  els.btnBookmark.setAttribute('aria-pressed', String(isBookmarked));
  els.btnBookmark.setAttribute(
    'aria-label',
    isBookmarked ? 'Прибрати закладку' : 'Додати закладку'
  );

  if (bookmarks.length > 0) {
    els.btnBookmarksList.hidden = false;
    els.bookmarksBadge.textContent = String(bookmarks.length);
  } else {
    els.btnBookmarksList.hidden = true;
  }
}

async function toggleBookmarkOnCurrentCard() {
  if (!state.activeDoc || state.currentIndex >= state.cards.length) return;

  const set = new Set(state.activeDoc.bookmarks || []);
  let added = false;
  if (set.has(state.currentIndex)) {
    set.delete(state.currentIndex);
  } else {
    set.add(state.currentIndex);
    added = true;
  }

  state.activeDoc.bookmarks = [...set].sort((a, b) => a - b);
  state.activeDoc = await saveDocument(state.activeDoc);
  updateBookmarkUI();
  showToast(added ? 'Картку додано в закладки' : 'Закладку прибрано');
}

function renderBookmarksSheet() {
  els.bookmarksList.innerHTML = '';
  const bookmarks = state.activeDoc?.bookmarks || [];

  if (bookmarks.length === 0) {
    const p = document.createElement('p');
    p.className = 'bookmarks-empty';
    p.textContent = 'Поки немає закладок. Натисни на іконку прапорця або клавішу B під час читання.';
    els.bookmarksList.appendChild(p);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const idx of bookmarks) {
    const cardText = state.cards[idx];
    if (!cardText) continue;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bookmark-item';

    const num = document.createElement('span');
    num.className = 'bookmark-item-num';
    num.textContent = `Картка ${idx + 1}`;

    const preview = document.createElement('span');
    preview.className = 'bookmark-item-text';
    preview.textContent = cardText;

    btn.appendChild(num);
    btn.appendChild(preview);
    btn.addEventListener('click', () => {
      closeAllSheets();
      scrollToCard(idx);
    });

    fragment.appendChild(btn);
  }

  els.bookmarksList.appendChild(fragment);
}

function stopFocusTimer() {
  if (state.timerInterval) {
    window.clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  state.timerMinutes = 0;
  state.timerEndsAt = 0;
  els.timerPill.hidden = true;
  els.timerButtons.forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.timerChoice) === 0);
  });
}

function updateTimerPill() {
  const remainingMs = state.timerEndsAt - Date.now();
  if (remainingMs <= 0) {
    stopFocusTimer();
    showToast('Час фокусу завершено — можеш зробити паузу або читати далі');
    return;
  }
  const minsLeft = Math.max(1, Math.ceil(remainingMs / 60000));
  els.timerPill.textContent = `~${minsLeft} хв`;
  els.timerPill.hidden = false;
}

function setFocusTimer(minutes) {
  stopFocusTimer();
  if (!minutes || minutes <= 0) return;

  state.timerMinutes = minutes;
  state.timerEndsAt = Date.now() + minutes * 60 * 1000;
  els.timerButtons.forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.timerChoice) === minutes);
  });

  updateTimerPill();
  state.timerInterval = window.setInterval(updateTimerPill, 15000);
  showToast(`М’який таймер на ${minutes} хв увімкнено`);
}

/* ==========================================================================
   Рендер карток та прогресу
   ========================================================================== */

let persistTimer = null;

function scheduleDocPersist() {
  if (!state.activeDoc) return;
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(async () => {
    if (!state.activeDoc) return;
    state.activeDoc = await saveDocument(state.activeDoc);
  }, 250);
}

function updateProgressUI(index) {
  const total = state.cards.length;
  if (total === 0) return;

  const isDoneSlide = index >= total;
  const clamped = Math.min(index, total - 1);
  const percent = isDoneSlide
    ? 100
    : Math.round(((clamped + 1) / total) * 100);

  els.progressFill.style.width = `${percent}%`;
  els.progressTrack.setAttribute('aria-valuenow', String(percent));
  els.cardCounter.textContent = isDoneSlide
    ? `Готово · ${total} / ${total}`
    : `${clamped + 1} / ${total}`;

  state.currentIndex = clamped;
  if (state.activeDoc) {
    state.activeDoc.currentIndex = clamped;
    state.activeDoc.totalCards = total;
    scheduleDocPersist();
  }
  updateBookmarkUI();
}

function createCardSlide(text, index, total) {
  const slide = document.createElement('article');
  slide.className = 'card-slide';
  slide.dataset.index = String(index);

  const body = document.createElement('div');
  body.className = 'card-body';

  const p = document.createElement('p');
  p.className = 'card-text';
  if (state.settings.anchorMode) {
    p.innerHTML = formatWithAnchors(text);
  } else {
    p.textContent = text;
  }

  body.appendChild(p);

  if (index === 0 && total > 1) {
    const hint = document.createElement('div');
    hint.className = 'card-hint';
    hint.textContent = 'Свайпни вгору або натисни Пробіл ↓';
    body.appendChild(hint);
  }

  slide.appendChild(body);
  return slide;
}

function createDoneSlide(total) {
  const slide = document.createElement('article');
  slide.className = 'card-slide';
  slide.dataset.index = String(total);

  const body = document.createElement('div');
  body.className = 'card-body card-done';
  body.innerHTML = `
    <div class="done-badge" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <h2>Текст прочитано</h2>
    <p>Пройдено ${total} ${pluralizeCards(total)} у спокійному темпі.</p>
    <div class="done-actions">
      <button type="button" class="btn btn-secondary btn-sm" data-action="restart">Читати знову</button>
      <button type="button" class="btn btn-primary btn-sm" data-action="library">До бібліотеки</button>
    </div>
  `;

  body.querySelector('[data-action="restart"]').addEventListener('click', () => {
    scrollToCard(0);
  });

  body.querySelector('[data-action="library"]').addEventListener('click', () => {
    closeReader();
  });

  slide.appendChild(body);
  return slide;
}

function pluralizeCards(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'картку';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'картки';
  return 'карток';
}

function setupObserver() {
  if (state.observer) {
    state.observer.disconnect();
  }

  state.observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          const idx = Number(entry.target.dataset.index);
          if (!Number.isNaN(idx)) {
            updateProgressUI(idx);
          }
        }
      }
    },
    {
      root: els.cardsFeed,
      threshold: 0.6
    }
  );

  els.cardsFeed.querySelectorAll('.card-slide').forEach((slide) => {
    state.observer.observe(slide);
  });
}

function renderCards(startIndex = 0) {
  els.cardsFeed.innerHTML = '';

  const fragment = document.createDocumentFragment();
  state.cards.forEach((cardText, idx) => {
    fragment.appendChild(createCardSlide(cardText, idx, state.cards.length));
  });
  fragment.appendChild(createDoneSlide(state.cards.length));

  els.cardsFeed.appendChild(fragment);
  setupObserver();

  const safeIndex = Math.min(Math.max(0, startIndex), state.cards.length - 1);
  updateProgressUI(safeIndex);

  requestAnimationFrame(() => {
    scrollToCard(safeIndex, 'instant');
  });
}

function scrollToCard(index, behavior = 'smooth') {
  const slides = els.cardsFeed.querySelectorAll('.card-slide');
  const clamped = Math.min(Math.max(0, index), slides.length - 1);
  const target = slides[clamped];
  if (target) {
    target.scrollIntoView({ behavior, block: 'start' });
  }
}

function getVisibleSlideIndex() {
  const height = els.cardsFeed.clientHeight || window.innerHeight;
  return Math.round(els.cardsFeed.scrollTop / height);
}

/* ==========================================================================
   Переходи між екранами та панелями
   ========================================================================== */

function openReaderWithDoc(doc) {
  const cards = splitTextIntoCards(doc.text, {
    lengthPreset: state.settings.cardLength
  });
  if (cards.length === 0) return;

  state.activeDoc = { ...doc, totalCards: cards.length };
  state.cards = cards;

  els.viewInput.hidden = true;
  els.viewReader.hidden = false;
  renderCards(doc.currentIndex || 0);
  els.cardsFeed.focus({ preventScroll: true });
}

async function startNewReading(title, text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const cards = splitTextIntoCards(trimmed, {
    lengthPreset: state.settings.cardLength
  });
  if (cards.length === 0) return;

  const doc = await saveDocument({
    title: title.trim() || deriveTitle(trimmed),
    text: trimmed,
    currentIndex: 0,
    totalCards: cards.length,
    bookmarks: []
  });

  els.titleInput.value = '';
  els.textInput.value = '';
  updateInputState();

  openReaderWithDoc(doc);
}

async function closeReader() {
  closeAllSheets();
  stopFocusTimer();

  if (state.activeDoc) {
    state.activeDoc = await saveDocument(state.activeDoc);
  }

  els.viewReader.hidden = true;
  els.viewInput.hidden = false;
  await renderLibrary();
}

function openSheet(sheetEl) {
  els.sheetBackdrop.hidden = false;
  els.settingsSheet.hidden = sheetEl !== els.settingsSheet;
  els.bookmarksSheet.hidden = sheetEl !== els.bookmarksSheet;
}

function closeAllSheets() {
  els.sheetBackdrop.hidden = true;
  els.settingsSheet.hidden = true;
  els.bookmarksSheet.hidden = true;
}

function isAnySheetOpen() {
  return !els.settingsSheet.hidden || !els.bookmarksSheet.hidden;
}

/* ==========================================================================
   Події
   ========================================================================== */

function bindEvents() {
  els.btnQuickTheme.addEventListener('click', () => {
    const nextIdx = (THEME_ORDER.indexOf(state.settings.theme) + 1) % THEME_ORDER.length;
    updateSettings({ theme: THEME_ORDER[nextIdx] });
  });

  els.textInput.addEventListener('input', updateInputState);

  els.btnPaste.addEventListener('click', async () => {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      showFeedback('Встав текст вручну у поле вище (Cmd+V або довгий тап).');
      els.textInput.focus();
      return;
    }
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText.trim()) {
        showFeedback('Буфер обміну порожній.');
        return;
      }
      els.textInput.value = clipText;
      updateInputState();
      showFeedback('Текст вставлено з буфера.');
    } catch {
      showFeedback('Браузер обмежив доступ — встав текст вручну у поле вище.');
      els.textInput.focus();
    }
  });

  els.btnImport.addEventListener('click', () => {
    els.fileImport.click();
  });

  els.fileImport.addEventListener('change', async (e) => {
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

      const cleanName = file.name.replace(/\.(txt|md)$/i, '');
      els.titleInput.value = cleanName;
      els.textInput.value = prepared;
      updateInputState();
      showFeedback(`Імпортовано «${file.name}». Натисни «Почати читання».`);
    } catch {
      showFeedback('Не вдалося прочитати файл.');
    } finally {
      els.fileImport.value = '';
    }
  });

  els.btnSample.addEventListener('click', () => {
    els.titleInput.value = 'Знайомство з Plyn';
    els.textInput.value = SAMPLE_TEXT;
    updateInputState();
    showFeedback('Приклад завантажено. Натисни «Почати читання».');
  });

  els.btnStart.addEventListener('click', () => {
    startNewReading(els.titleInput.value, els.textInput.value);
  });

  // Керування у рідері
  els.btnBack.addEventListener('click', closeReader);
  els.btnBookmark.addEventListener('click', toggleBookmarkOnCurrentCard);

  els.btnBookmarksList.addEventListener('click', () => {
    renderBookmarksSheet();
    openSheet(els.bookmarksSheet);
  });

  els.btnAnchorQuick.addEventListener('click', () => {
    updateSettings({ anchorMode: !state.settings.anchorMode }, { rerenderCards: true });
  });

  els.btnPrevCard.addEventListener('click', () => {
    scrollToCard(getVisibleSlideIndex() - 1);
  });

  els.btnNextCard.addEventListener('click', () => {
    scrollToCard(getVisibleSlideIndex() + 1);
  });

  // Панелі налаштувань та закладок
  els.btnSettings.addEventListener('click', () => openSheet(els.settingsSheet));
  els.btnCloseSettings.addEventListener('click', closeAllSheets);
  els.btnCloseBookmarks.addEventListener('click', closeAllSheets);
  els.sheetBackdrop.addEventListener('click', closeAllSheets);

  els.toggleAnchor.addEventListener('change', (e) => {
    updateSettings({ anchorMode: e.target.checked }, { rerenderCards: true });
  });

  els.themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      updateSettings({ theme: btn.dataset.themeChoice });
    });
  });

  els.lengthButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      updateSettings({ cardLength: btn.dataset.lengthChoice }, { rerenderCards: true });
    });
  });

  els.timerButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setFocusTimer(Number(btn.dataset.timerChoice));
    });
  });

  els.rangeFontSize.addEventListener('input', (e) => {
    updateSettings({ fontSize: Number(e.target.value) });
  });

  els.rangeLineHeight.addEventListener('input', (e) => {
    updateSettings({ lineHeight: Number(e.target.value) });
  });

  // Клавіатура для MacBook
  document.addEventListener('keydown', (e) => {
    if (els.viewReader.hidden) return;

    if (e.key === 'Escape') {
      if (isAnySheetOpen()) {
        closeAllSheets();
      } else {
        closeReader();
      }
      return;
    }

    if (isAnySheetOpen()) return;

    if (e.code === 'Space' && !e.shiftKey) {
      e.preventDefault();
      scrollToCard(getVisibleSlideIndex() + 1);
    } else if (e.code === 'Space' && e.shiftKey) {
      e.preventDefault();
      scrollToCard(getVisibleSlideIndex() - 1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'j') {
      e.preventDefault();
      scrollToCard(getVisibleSlideIndex() + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'k') {
      e.preventDefault();
      scrollToCard(getVisibleSlideIndex() - 1);
    } else if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'ф') {
      e.preventDefault();
      updateSettings({ anchorMode: !state.settings.anchorMode }, { rerenderCards: true });
    } else if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'и') {
      e.preventDefault();
      toggleBookmarkOnCurrentCard();
    }
  });
}

/* ==========================================================================
   Реєстрація Service Worker та старт
   ========================================================================== */

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Ігноруємо помилку на локальному file://
      });
    });
  }
}

async function init() {
  applySettings();
  updateInputState();
  bindEvents();
  registerServiceWorker();
  await migrateLegacySession();
  await renderLibrary();
}

init();
