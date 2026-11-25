/**
 * Локальне збереження налаштувань та прогресу читання (localStorage).
 */

const KEYS = {
  SETTINGS: 'plyn_settings_v1',
  SESSION: 'plyn_session_v1'
};

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  fontSize: 24,
  lineHeight: 1.65,
  anchorMode: false,
  cardLength: 'medium'
};

function safeRead(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ігноруємо помилки квоти або приватного режиму Safari
  }
}

export function loadSettings() {
  const saved = safeRead(KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(saved || {}) };
}

export function saveSettings(settings) {
  safeWrite(KEYS.SETTINGS, settings);
}

export function loadSession() {
  const session = safeRead(KEYS.SESSION);
  if (!session || typeof session.text !== 'string' || !session.text.trim()) {
    return null;
  }
  return session;
}

export function saveSession({ text, currentIndex, totalCards }) {
  safeWrite(KEYS.SESSION, {
    text,
    currentIndex: Math.max(0, currentIndex || 0),
    totalCards: Math.max(1, totalCards || 1),
    updatedAt: Date.now()
  });
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEYS.SESSION);
  } catch {
    // Ігноруємо
  }
}
