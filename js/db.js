/**
 * Локальна міні-бібліотека текстів на базі IndexedDB.
 * Зберігає кілька текстів паралельно з прогресом читання та закладками.
 */

const DB_NAME = 'plyn_library_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB недоступна'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Повертає всі збережені документи, відсортовані від найсвіжіших.
 * @returns {Promise<Array>}
 */
export async function getAllDocuments() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Отримує один документ за id.
 * @param {string} id
 */
export async function getDocument(id) {
  if (!id) return null;
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Створює новий або оновлює існуючий документ у бібліотеці.
 * @param {Object} doc
 */
export async function saveDocument(doc) {
  const now = Date.now();
  const record = {
    id: doc.id || generateId(),
    title: (doc.title || '').trim() || deriveTitle(doc.text),
    text: doc.text || '',
    currentIndex: Math.max(0, doc.currentIndex || 0),
    totalCards: Math.max(1, doc.totalCards || 1),
    bookmarks: Array.isArray(doc.bookmarks) ? [...new Set(doc.bookmarks)].sort((a, b) => a - b) : [],
    createdAt: doc.createdAt || now,
    updatedAt: now
  };

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ігноруємо у приватному режимі, якщо IndexedDB заблоковано
  }

  return record;
}

/**
 * Видаляє документ із бібліотеки.
 * @param {string} id
 */
export async function deleteDocument(id) {
  if (!id) return;
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ігноруємо
  }
}

/**
 * Автоматично формує короткий заголовок із першого рядка тексту.
 * @param {string} text
 */
export function deriveTitle(text) {
  const firstLine = (text || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean) || 'Без назви';

  if (firstLine.length <= 54) return firstLine;
  return `${firstLine.slice(0, 51).trimEnd()}…`;
}
