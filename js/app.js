import { splitTextIntoCards, formatWithAnchors } from './splitter.js';
import {
  loadSettings,
  saveSettings,
  loadSession,
  saveSession,
  clearSession
} from './storage.js';

const THEME_META_COLORS = {
  dark: '#16181D',
  paper: '#F4EFE6',
  gray: '#2C2F33'
};

const THEME_ORDER = ['dark', 'paper', 'gray'];

const SAMPLE_TEXT = `Коли перед очима відкривається довга «стіна тексту», мозок часто втомлюється ще до першого абзацу. Погляд зісковзує на сусідній рядок, і доводиться перечитувати одне й те саме речення по три рази.

Plyn прибирає це перевантаження. Замість нескінченного полотна ти бачиш лише одну коротку думку за раз — у спокійній рамці та з чіткими межами.

Свайпай вгору на iPhone або натискай Пробіл чи стрілки на MacBook, щоб рухатися далі. Верхня смужка показує реальний прогрес і дає мозку приємне відчуття завершеності.

Спробуй увімкнути режим «Якір» у верхньому правому куті або в налаштуваннях. Виділений початок кожного слова працює як точка опори — очі перестають «пливти», і читати стає помітно легше.

Ти також можеш змінити тему на паперову чи сіру, підкрутити розмір шрифту та міжрядковий інтервал. Весь прогрес зберігається локально на пристрої, тож ти завжди повернешся рівно на ту картку, де зупинився.`;

const state = {
  settings: loadSettings(),
  text: '',
  cards: [],
  currentIndex: 0,
  observer: null
};

// DOM-елементи
const els = {
  metaThemeColor: document.getElementById('meta-theme-color'),
  viewInput: document.getElementById('view-input'),
  viewReader: document.getElementById('view-reader'),

  btnQuickTheme: document.getElementById('btn-quick-theme'),
  resumeBanner: document.getElementById('resume-banner'),
  resumePreview: document.getElementById('resume-preview'),
  resumeMeta: document.getElementById('resume-meta'),
  btnResume: document.getElementById('btn-resume'),
  btnClearSession: document.getElementById('btn-clear-session'),

  textInput: document.getElementById('text-input'),
  charCount: document.getElementById('char-count'),
  inputFeedback: document.getElementById('input-feedback'),
  btnPaste: document.getElementById('btn-paste'),
  btnSample: document.getElementById('btn-sample'),
  btnStart: document.getElementById('btn-start'),

  progressTrack: document.getElementById('progress-track'),
  progressFill: document.getElementById('progress-fill'),
  cardCounter: document.getElementById('card-counter'),
  btnBack: document.getElementById('btn-back'),
  btnAnchorQuick: document.getElementById('btn-anchor-quick'),
  btnSettings: document.getElementById('btn-settings'),
  cardsFeed: document.getElementById('cards-feed'),
  btnPrevCard: document.getElementById('btn-prev-card'),
  btnNextCard: document.getElementById('btn-next-card'),

  settingsBackdrop: document.getElementById('settings-backdrop'),
  settingsSheet: document.getElementById('settings-sheet'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  toggleAnchor: document.getElementById('toggle-anchor'),
  rangeFontSize: document.getElementById('range-font-size'),
  valFontSize: document.getElementById('val-font-size'),
  rangeLineHeight: document.getElementById('range-line-height'),
  valLineHeight: document.getElementById('val-line-height'),
  themeButtons: document.querySelectorAll('[data-theme-choice]'),
  lengthButtons: document.querySelectorAll('[data-length-choice]')
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

  if (rerenderCards && !els.viewReader.hidden && state.text) {
    state.cards = splitTextIntoCards(state.text, {
      lengthPreset: state.settings.cardLength
    });
    const nextIndex = Math.min(
      state.cards.length - 1,
      Math.max(0, Math.round(progressRatio * state.cards.length))
    );
    renderCards(nextIndex);
  }
}

/* ==========================================================================
   Екран вводу та збережена сесія
   ========================================================================== */

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
  }, 3000);
}

function renderResumeBanner() {
  const session = loadSession();
  if (!session) {
    els.resumeBanner.hidden = true;
    return;
  }

  const cards = splitTextIntoCards(session.text, {
    lengthPreset: state.settings.cardLength
  });
  if (cards.length === 0) {
    els.resumeBanner.hidden = true;
    return;
  }

  const safeIdx = Math.min(session.currentIndex, cards.length - 1);
  const percent = Math.round(((safeIdx + 1) / cards.length) * 100);

  els.resumePreview.textContent = cards[safeIdx];
  els.resumeMeta.textContent = `Картка ${safeIdx + 1} з ${cards.length} · ${percent}%`;
  els.resumeBanner.hidden = false;
}

/* ==========================================================================
   Рендер карток та прогресу
   ========================================================================== */

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
  saveSession({
    text: state.text,
    currentIndex: clamped,
    totalCards: total
  });
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
      <button type="button" class="btn btn-primary btn-sm" data-action="new-text">Новий текст</button>
    </div>
  `;

  body.querySelector('[data-action="restart"]').addEventListener('click', () => {
    scrollToCard(0);
  });

  body.querySelector('[data-action="new-text"]').addEventListener('click', () => {
    closeReader({ focusInput: true });
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
   Переходи між екранами та налаштуваннями
   ========================================================================== */

function openReader(text, startIndex = 0) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const cards = splitTextIntoCards(trimmed, {
    lengthPreset: state.settings.cardLength
  });
  if (cards.length === 0) return;

  state.text = trimmed;
  state.cards = cards;

  els.viewInput.hidden = true;
  els.viewReader.hidden = false;
  renderCards(startIndex);
  els.cardsFeed.focus({ preventScroll: true });
}

function closeReader({ focusInput = false } = {}) {
  closeSettings();
  els.viewReader.hidden = true;
  els.viewInput.hidden = false;
  renderResumeBanner();

  if (focusInput) {
    els.textInput.value = '';
    updateInputState();
    els.textInput.focus();
  }
}

function openSettings() {
  els.settingsBackdrop.hidden = false;
  els.settingsSheet.hidden = false;
}

function closeSettings() {
  els.settingsBackdrop.hidden = true;
  els.settingsSheet.hidden = true;
}

/* ==========================================================================
   Події
   ========================================================================== */

function bindEvents() {
  // Швидке перемикання теми на головному екрані
  els.btnQuickTheme.addEventListener('click', () => {
    const nextIdx = (THEME_ORDER.indexOf(state.settings.theme) + 1) % THEME_ORDER.length;
    updateSettings({ theme: THEME_ORDER[nextIdx] });
  });

  // Ввід тексту
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

  els.btnSample.addEventListener('click', () => {
    els.textInput.value = SAMPLE_TEXT;
    updateInputState();
    showFeedback('Приклад завантажено. Натисни «Почати читання».');
  });

  els.btnStart.addEventListener('click', () => {
    openReader(els.textInput.value, 0);
  });

  // Продовження або скидання збереженої сесії
  els.btnResume.addEventListener('click', () => {
    const session = loadSession();
    if (session) {
      els.textInput.value = session.text;
      updateInputState();
      openReader(session.text, session.currentIndex);
    }
  });

  els.btnClearSession.addEventListener('click', () => {
    clearSession();
    renderResumeBanner();
  });

  // Керування у рідері
  els.btnBack.addEventListener('click', () => closeReader());

  els.btnAnchorQuick.addEventListener('click', () => {
    updateSettings({ anchorMode: !state.settings.anchorMode }, { rerenderCards: true });
  });

  els.btnPrevCard.addEventListener('click', () => {
    scrollToCard(getVisibleSlideIndex() - 1);
  });

  els.btnNextCard.addEventListener('click', () => {
    scrollToCard(getVisibleSlideIndex() + 1);
  });

  // Панель налаштувань
  els.btnSettings.addEventListener('click', openSettings);
  els.btnCloseSettings.addEventListener('click', closeSettings);
  els.settingsBackdrop.addEventListener('click', closeSettings);

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
      if (!els.settingsSheet.hidden) {
        closeSettings();
      } else {
        closeReader();
      }
      return;
    }

    if (!els.settingsSheet.hidden) return;

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

function init() {
  applySettings();
  updateInputState();
  renderResumeBanner();
  bindEvents();
  registerServiceWorker();
}

init();
